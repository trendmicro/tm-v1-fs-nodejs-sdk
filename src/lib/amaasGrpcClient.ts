import { statSync } from 'fs'
import { status, credentials, Metadata, ServiceError } from '@grpc/grpc-js'

import { ScanClient } from './protos/scan_grpc_pb'
import { ScanRun } from './scanRun'
import { AmaasScanResultObject } from './amaasScanResultObject'
import { AmaasScanResultVerbose } from './amaasScanResultVerbose'
import { AmaasCredentials } from './amaasCredentials'
import { CallMetadataGenerator } from '@grpc/grpc-js/build/src/call-credentials'
import {getFQDN, validateTags } from './utils'
import { LogLevel, Logger } from './logger'

type LogCallback = (level: LogLevel, message: string) => void

/**
 * Class AmaasGrpcClient
 */
export class AmaasGrpcClient {
  private readonly scanClient: ScanClient
  private readonly credentKey: string
  private readonly timeout: number
  private readonly logger: Logger
  private readonly appNameHeader: string

  /**
   * AmaasGrpcClient constructor
   * @param amaasHostName - AMaaS host name or region name
   * @param credent - AmaasCredentials object
   * @param timeout - number in seconds to wait before closing the connection
   * @param enableTLS - enabling TLS
   * @param appName - application name
   */
  constructor (
    amaasHostName: string,
    credent: AmaasCredentials | string,
    timeout = 300,
    enableTLS = true,
    appName = 'V1FS'
  ) {
    const key = typeof credent === 'string' ? credent : credent.secret
    this.timeout = timeout
    this.credentKey = 'Authorization'
    this.appNameHeader = 'tm-app-name'
    this.logger = new Logger()
    let hostname = amaasHostName

    // Check if the hostname is a valid FQDN
    if (!amaasHostName.includes('.') && !amaasHostName.includes('localhost')) {
      hostname = amaasHostName.length > 0 ? getFQDN(amaasHostName) : hostname
    }

    try {
      if (enableTLS === true) {
        const channelCred = credentials.createSsl()
        const metaCallback: CallMetadataGenerator = (
          _params,
          callback: (err: Error | null, metadata?: Metadata) => void
        ) => {
          const meta: Metadata = new Metadata()
          meta.add(
            this.credentKey,
            `ApiKey ${key}`
          )
          meta.add(
            this.appNameHeader,
            appName
          )
          callback(null, meta)
        }
        const callCred =
          credentials.createFromMetadataGenerator(metaCallback)
        const combCred = credentials.combineChannelCredentials(
          channelCred,
          callCred
        )
        this.scanClient = new ScanClient(
          hostname,
          combCred,
          { 'grpc.service_config_disable_resolution': 1 }
        )
      } else {
        this.scanClient = new ScanClient(
          hostname,
          credentials.createInsecure(),
          { 'grpc.service_config_disable_resolution': 1 }
        )
      }
    } catch (err) {
      const _err = err as Error
      throw new Error(`Failed to create scan client. ${_err.message}`)
    }
  }

  /**
   * Process error
   *
   * @param err - Error to process
   */
  private processError (err: ServiceError): Error {
    let message: string

    if (err.code !== undefined) {
      if (err.code.toString() === 'EACCES') {
        message = `Failed to open file. ${err.message}`
      } else {
        switch (err.code) {
          case status.NOT_FOUND:
            message = `The requested resource was not found. ${err.details}`
            break
          case status.PERMISSION_DENIED:
            message = `You do not have sufficient permissions to access this resource. ${err.details}`
            break
          case status.UNAUTHENTICATED:
            message = `You are not authenticated. ${err.details}`
            break
          case status.DEADLINE_EXCEEDED:
            message = `The request deadline was exceeded. ${err.details}`
            break
          case status.UNAVAILABLE:
            if (['HTTP Status: 429; Exceeds rate limit'].includes(err.details)) {
              message = `Too many requests. ${err.details}`
            } else {
              message = `Service is not reachable. ${err.details}`
            }
            break
          default:
            message = err.details
        }
      }
    } else {
      message = err.message
    }

    return new Error(message)
  }

  // Init a scan run
  private initScanRun (tags?: string[]): ScanRun {
    let scanRun: ScanRun

    if (tags) {
      validateTags(tags)
      scanRun = new ScanRun(this.scanClient, this.timeout, this.logger, tags)
    } else {
      scanRun = new ScanRun(this.scanClient, this.timeout, this.logger)
    }

    return scanRun
  }

  /**
   * Scan file and return result
   *
   * @param name - Filename
   * @param tags - Tags to be added to the scan request
   * @param pml - Flag to enable predictive machine learning detection.
   * @param feedback - Flag to use Trend Micro Smart Protection Network's Smart Feedback.
   * @param verbose - Flag to enable verbose mode in returning scan result
   */
  public async scanFile (name: string, tags?: string[], pml: boolean = false, feedback: boolean = false, verbose: boolean = false): Promise<AmaasScanResultObject | AmaasScanResultVerbose> {
    let size: number

    try {
      size = statSync(name).size
    } catch (err) {
      const _err = err as Error
      throw new Error(`Failed to open file. ${_err.message}`)
    }

    const scanRun = this.initScanRun(tags)
    return await scanRun
      .scanFile(name, size, pml, feedback, verbose)
      .then(result => result)
      .catch(err => {
        throw this.processError(err)
      })
  }

  /**
   * Scan buffer and return scan result
   *
   * @param fileName - Filename
   * @param buff - Buffer to scan
   * @param tags - Tags to be added to the scan request
   * @param pml - Flag to enable predictive machine learning detection.
   * @param feedback - Flag to use Trend Micro Smart Protection Network's Smart Feedback.
   * @param verbose - Flag to enable verbose mode in returning scan result
   */
  public async scanBuffer (fileName: string, buff: Buffer, tags?: string[], pml: boolean = false, feedback: boolean = false, verbose: boolean = false): Promise<AmaasScanResultObject | AmaasScanResultVerbose> {
    const scanRun = this.initScanRun(tags)
    return await scanRun
      .scanBuffer(fileName, buff, pml, feedback, verbose)
      .then(result => result)
      .catch(err => {
        throw this.processError(err)
      })
  }

  /**
   * Close scan client
   */
  public close = (): void => {
    // Close channel
    this.scanClient.getChannel().close()

    // Close scan client
    this.scanClient.close()
  }

  public setLoggingLevel = (level: LogLevel): void => {
    this.logger.setLoggingLevel(level)
  }

  public configLoggingCallback = (cb: LogCallback): void => {
    this.logger.configLoggingCallback(cb)
  }
}
