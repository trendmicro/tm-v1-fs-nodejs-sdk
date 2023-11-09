import { AmaasGrpcClient, LogLevel } from 'file-security-sdk'

/**
 * Configure logger for AmaasGrpcClient.
 * Set log level and log callback function.
 * @param client
 */
const loggerConfig = (client: AmaasGrpcClient): void => {
  const logCallback = (level: LogLevel, message: string): void => {
    console.log(`logCallback is called, level: ${level}, message: ${message}`)
  }
  let logLevel: LogLevel

  switch (process.env.TM_AM_LOG_LEVEL) {
    case 'FATAL':
      logLevel = LogLevel.FATAL
      break
    case 'ERROR':
      logLevel = LogLevel.ERROR
      break
    case 'WARN':
      logLevel = LogLevel.WARN
      break
    case 'INFO':
      logLevel = LogLevel.INFO
      break
    case 'DEBUG':
      logLevel = LogLevel.DEBUG
      break
    default:
      logLevel = LogLevel.OFF
      break
  }

  client.setLoggingLevel(logLevel)
  client.configLoggingCallback(logCallback)
}

export default loggerConfig
