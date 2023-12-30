import { basename } from 'path'
import { openSync, readSync, closeSync } from 'fs'

import * as scanPb from './protos/scan_pb'
import { ScanClient } from './protos/scan_grpc_pb'
import { AmaasScanResultObject } from './amaasScanResultObject'
import { Logger } from './logger'
import { ClientDuplexStream, Deadline } from '@grpc/grpc-js'
import { getBufferHashes, getHashes } from './utils'

const sha1Prefix = 'sha1:'
const sha256Prefix = 'sha256:'

export class ScanRun {
  private readonly scanClient: ScanClient
  private readonly deadline: number
  private readonly logger: Logger
  private finalResult: AmaasScanResultObject
  private readonly tags: string[]

  constructor (scanClient: ScanClient, timeout: number, logger: Logger, tags?: string[]) {
    this.scanClient = scanClient
    this.deadline = timeout
    this.logger = logger
    this.finalResult = Object.create(null) as AmaasScanResultObject
    this.tags = tags ?? []
  }

  private async streamRun (fileName: string, fileSize: number, hashes: string[], buff?: Buffer): Promise<AmaasScanResultObject> {
    return await new Promise<AmaasScanResultObject>((resolve, reject) => {
      const _deadline: Deadline = new Date().getTime() + this.deadline * 1000
      const stream = this.scanClient.run({ deadline: _deadline })
      stream.on('data', (response: scanPb.S2C) => {
        this.handleStreamData(response, fileName, stream, buff)
      })
      stream.on('error', (err: Error) => {
        const error = ['Metadata key ""'].includes(String(err))
          ? new Error(`Failed to setup connection to AMaaS host. ${String(err)}`)
          : err
        reject(error)
      })
      stream.on('end', () => {
        resolve(this.finalResult)
      })

      // INIT stage
      const initRequest = new scanPb.C2S()
      initRequest.setStage(scanPb.Stage.STAGE_INIT)
      const fileNameToSet = buff !== undefined ? fileName : basename(fileName)
      initRequest.setFileName(fileNameToSet)
      initRequest.setRsSize(fileSize)
      if (this.tags) {
        initRequest.setTagsList(this.tags)
      }
      this.logger.debug(`sha1: ${hashes[1]}`)
      this.logger.debug(`sha256: ${hashes[0]}`)
      initRequest.setFileSha1(`${sha1Prefix}${hashes[1]}`)
      initRequest.setFileSha256(`${sha256Prefix}${hashes[0]}`)
      stream.write(initRequest)
    })
  }

  private handleStreamData (
    response: scanPb.S2C,
    fileName: string,
    stream: ClientDuplexStream<scanPb.C2S, scanPb.S2C>,
    buff: Buffer | undefined
  ): void {
    const cmd = response.getCmd()
    const length: number = response.getLength()
    const offset: number = response.getOffset()

    if (cmd === scanPb.Command.CMD_RETR && length > 0) {
      this.logger.debug(`stage RUN, try to read ${length} at offset ${offset}`)
      const chunk = buff !== undefined ? buff.subarray(offset, offset + length) : Buffer.alloc(length)
      if (buff === undefined) {
        const fd = openSync(fileName, 'r')
        readSync(fd, chunk, 0, length, offset)
        closeSync(fd)
      }
      const request = new scanPb.C2S()
      request.setStage(scanPb.Stage.STAGE_RUN)
      request.setOffset(response.getOffset())
      request.setChunk(chunk)
      stream.write(request)
    } else if (cmd === scanPb.Command.CMD_QUIT) {
      this.logger.debug('receive QUIT, exit loop...\n')
      const result = response.getResult()
      const resultJson = JSON.parse(result)
      this.finalResult = resultJson
      stream.end()
    } else {
      this.logger.debug('unknown command...')
      stream.end()
    }
  }

  public async scanFile (
    name: string,
    size: number
  ): Promise<AmaasScanResultObject> {
    const hashes = await getHashes(name, ['sha256', 'sha1'], 'hex')
    return await this.streamRun(name, size, hashes)
      .then(result => {
        return result
      })
      .catch(reason => { throw reason })
  }

  public async scanBuffer (
    name: string,
    buff: Buffer
  ): Promise<AmaasScanResultObject> {
    const size = Buffer.byteLength(buff)
    const hashes = await getBufferHashes(buff, ['sha256', 'sha1'], 'hex')
    return await this.streamRun(name, size, hashes, buff)
      .then(result => result)
      .catch(err => { throw err })
  }
}
