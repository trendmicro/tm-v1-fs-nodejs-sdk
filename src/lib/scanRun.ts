import { basename } from 'path'
import { openSync, readSync, closeSync } from 'fs'

import { C2S, S2C, Stage, Command } from './protos/scan'
import { ScanClient } from './protos/scan.grpc-client'
import { AmaasScanResultObject } from './amaasScanResultObject'
import { AmaasScanResultVerbose } from './amaasScanResultVerbose'
import { Logger } from './logger'
import { ClientDuplexStream, Deadline } from '@grpc/grpc-js'
import { getBufferHashes, getHashes } from './utils'

const sha1Prefix = 'sha1:'
const sha256Prefix = 'sha256:'

export class ScanRun {
  private readonly scanClient: ScanClient
  private readonly deadline: number
  private readonly logger: Logger
  private finalResult: object
  private readonly tags: string[]
  private readonly bulk: boolean

  constructor (scanClient: ScanClient, timeout: number, logger: Logger, tags?: string[]) {
    this.scanClient = scanClient
    this.deadline = timeout
    this.logger = logger
    this.finalResult = Object.create(null)
    this.tags = tags ?? []
    this.bulk = false
  }

  private async streamRun (fileName: string, fileSize: number, hashes: string[], pml: boolean, feedback: boolean, verbose: boolean, buff?: Buffer): Promise<AmaasScanResultObject | AmaasScanResultVerbose> {
    return await new Promise<AmaasScanResultObject | AmaasScanResultVerbose>((resolve, reject) => {
      const _deadline: Deadline = new Date().getTime() + this.deadline * 1000
      const stream = this.scanClient.run({ deadline: _deadline })
      stream.on('data', (response: S2C) => {
        this.handleStreamData(response, fileName, verbose, stream, buff)
      })
      stream.on('error', (err: Error) => {
        const error = ['Metadata key ""'].includes(String(err))
          ? new Error(`Failed to setup connection to AMaaS host. ${String(err)}`)
          : err
        reject(error)
      })
      stream.on('end', () => {
        resolve((verbose) ? this.finalResult as AmaasScanResultVerbose : this.finalResult as AmaasScanResultObject)
      })

      // INIT stage
      const sha1Digest = hashes[1] ? `${sha1Prefix}${hashes[1]}` : ''
      const sha256Digest = hashes[0] ? `${sha256Prefix}${hashes[0]}` : ''
      this.logger.debug(`sha1: ${sha1Digest}`)
      this.logger.debug(`sha256: ${sha256Digest}`)
      const fileNameToSet = buff !== undefined ? fileName : basename(fileName)
      const initRequest: C2S = {
        stage: Stage.INIT,
        fileName: fileNameToSet,
        rsSize: fileSize.toString(),
        offset: 0,
        chunk: new Uint8Array(),
        trendx: pml,
        fileSha1: sha1Digest,
        fileSha256: sha256Digest,
        tags: this.tags || [],
        bulk: this.bulk,
        spnFeedback: feedback,
        verbose: verbose
      }
      stream.write(initRequest)
    })
  }

  private handleStreamData (
    response: S2C,
    fileName: string,
    verbose: boolean,
    stream: ClientDuplexStream<C2S, S2C>,
    buff?: Buffer
  ): void {
    const cmd = response.cmd
    const stage = response.stage

    if (cmd === Command.CMD_RETR) {
      let bulkLength: number[] = []
      let bulkOffset: number[] = []

      if (stage !== Stage.RUN) {
        throw new Error(`Received unexpected command ${cmd} and stage ${stage}.`)
      }

      if (this.bulk) {
        this.logger.debug("enter bulk mode")
        const bulkCount = response.bulkOffset.length
        if (bulkCount > 1) {
          this.logger.debug("bulk transfer triggered")
        }
        bulkLength = response.bulkLength
        bulkOffset = response.bulkOffset
      } else {
        bulkLength = [response.length]
        bulkOffset = [response.offset]
      }

      const fd = buff !== undefined ? undefined : openSync(fileName, 'r')

      for (let i = 0; i < bulkLength.length; i++) {
        this.logger.debug(`stage RUN, try to read ${bulkLength[i]} at offset ${bulkOffset[i]}`)
        const chunk = buff !== undefined ? buff.subarray(bulkOffset[i], bulkOffset[i] + bulkLength[i]) : Buffer.alloc(bulkLength[i])

        if (fd !== undefined) {
          readSync(fd, chunk, 0, bulkLength[i], bulkOffset[i])
        }

        const request: C2S = {
          stage: Stage.RUN,
          fileName: '',
          rsSize: '0',
          offset: bulkOffset[i],
          chunk: chunk,
          trendx: false,
          fileSha1: '',
          fileSha256: '',
          tags: [],
          bulk: false,
          spnFeedback: false,
          verbose: false
        }
        stream.write(request)
      }

      if (fd !== undefined) {
        closeSync(fd)
      }
    } else if (cmd === Command.CMD_QUIT) {
      this.logger.debug('receive QUIT, exit loop...\n')
      const result = response.result
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
    feedback: boolean,
    verbose: boolean,
    digest: boolean
  ): Promise<AmaasScanResultObject | AmaasScanResultVerbose> {
    const hashes = digest ? await getHashes(name, ['sha256', 'sha1'], 'hex') : [ '', '' ]
    return await this.streamRun(name, size, hashes, pml, feedback, verbose)
      .then(result => {
        return result
      })
      .catch(reason => { throw reason })
  }

  public async scanBuffer (
    name: string,
    buff: Buffer,
    pml: boolean,
    feedback: boolean,
    verbose: boolean,
    digest: boolean
  ): Promise<AmaasScanResultObject | AmaasScanResultVerbose> {
    const size = Buffer.byteLength(buff)
    const hashes = digest ? await getBufferHashes(buff, ['sha256', 'sha1'], 'hex') : [ '', '' ]
    return await this.streamRun(name, size, hashes, pml, feedback, verbose, buff)
      .then(result => result)
      .catch(err => { throw err })
  }
}
