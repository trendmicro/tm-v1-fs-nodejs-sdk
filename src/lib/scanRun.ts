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
  private readonly bulk: boolean

  constructor (scanClient: ScanClient, timeout: number, logger: Logger, tags?: string[]) {
    this.scanClient = scanClient
    this.deadline = timeout
    this.logger = logger
    this.finalResult = Object.create(null) as AmaasScanResultObject
    this.tags = tags ?? []
    this.bulk = true
  }

  private async streamRun (fileName: string, fileSize: number, hashes: string[], pml: boolean, feedback: boolean, buff?: Buffer): Promise<AmaasScanResultObject> {
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
      initRequest.setTrendx(pml)
      initRequest.setSpnFeedback(feedback)
      this.logger.debug(`sha1: ${hashes[1]}`)
      this.logger.debug(`sha256: ${hashes[0]}`)
      initRequest.setFileSha1(`${sha1Prefix}${hashes[1]}`)
      initRequest.setFileSha256(`${sha256Prefix}${hashes[0]}`)
      initRequest.setBulk(this.bulk)
      stream.write(initRequest)
    })
  }

  private handleStreamData (
    response: scanPb.S2C,
    fileName: string,
    stream: ClientDuplexStream<scanPb.C2S, scanPb.S2C>,
    buff?: Buffer
  ): void {
    const cmd = response.getCmd()
    const stage = response.getStage()

    if (cmd === scanPb.Command.CMD_RETR) {
      let bulkLength: number[] = []
      let bulkOffset: number[] = []

      if (stage !== scanPb.Stage.STAGE_RUN) {
        throw new Error(`Received unexpected command ${cmd} and stage ${stage}.`)
      }

      if (this.bulk) {
        this.logger.debug("enter bulk mode")
        const bulkCount = response.getBulkOffsetList().length
        if (bulkCount > 1) {
          this.logger.debug("bulk transfer triggered")
        }
        bulkLength = response.getBulkLengthList()
        bulkOffset = response.getBulkOffsetList()
      } else {
        bulkLength = [response.getLength()]
        bulkOffset = [response.getOffset()]
      }

      const fd = buff !== undefined ? undefined : openSync(fileName, 'r')

      for (let i = 0; i < bulkLength.length; i++) {
        this.logger.debug(`stage RUN, try to read ${bulkLength[i]} at offset ${bulkOffset[i]}`)
        const chunk = buff !== undefined ? buff.subarray(bulkOffset[i], bulkOffset[i] + bulkLength[i]) : Buffer.alloc(bulkLength[i])

        if (fd !== undefined) {
          readSync(fd, chunk, 0, bulkLength[i], bulkOffset[i])
        }

        const request = new scanPb.C2S()
        request.setStage(scanPb.Stage.STAGE_RUN)
        request.setOffset(bulkOffset[i])
        request.setChunk(chunk)
        stream.write(request)
      }

      if (fd !== undefined) {
        closeSync(fd)
      }
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
    size: number,
    pml: boolean,
    feedback: boolean
  ): Promise<AmaasScanResultObject> {
    const hashes = await getHashes(name, ['sha256', 'sha1'], 'hex')
    return await this.streamRun(name, size, hashes, pml, feedback)
      .then(result => {
        return result
      })
      .catch(reason => { throw reason })
  }

  public async scanBuffer (
    name: string,
    buff: Buffer,
    pml: boolean,
    feedback: boolean
  ): Promise<AmaasScanResultObject> {
    const size = Buffer.byteLength(buff)
    const hashes = await getBufferHashes(buff, ['sha256', 'sha1'], 'hex')
    return await this.streamRun(name, size, hashes, pml, feedback, buff)
      .then(result => result)
      .catch(err => { throw err })
  }
}
