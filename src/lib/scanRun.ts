import { basename } from 'path'
import { openSync, readSync, closeSync } from 'fs'

import * as scanPb from './scan_pb'
import { ScanClient } from './scan_grpc_pb'
import { AmaasScanResultObject } from './amaasScanResultObject'
import { Logger } from './logger'
import { ClientDuplexStream, Deadline } from '@grpc/grpc-js'

export class ScanRun {
  private readonly scanClient: ScanClient
  private readonly deadline: number
  private readonly logger: Logger
  private finalResult: AmaasScanResultObject

  constructor (scanClient: ScanClient, timeout: number, logger: Logger) {
    this.scanClient = scanClient
    this.deadline = timeout
    this.logger = logger
    this.finalResult = Object.create(null) as AmaasScanResultObject
  }

  private async streamRun (fileName: string, fileSize: number, buff?: Buffer): Promise<AmaasScanResultObject> {
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
    return await this.streamRun(name, size)
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
    return await this.streamRun(name, size, buff)
      .then(result => result)
      .catch(err => { throw err })
  }
}
