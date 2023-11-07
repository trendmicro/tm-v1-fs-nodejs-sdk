export enum LogLevel {
  OFF,
  FATAL,
  ERROR,
  WARN,
  INFO,
  DEBUG
}

type LogCallback = (level: LogLevel, message: string) => void

export class Logger {
  private logLevel: LogLevel
  private logCallback?: LogCallback

  constructor () {
    this.logLevel = this.parseLogLevel(process.env.TM_AM_LOG_LEVEL) ?? LogLevel.OFF
  }

  private parseLogLevel (level: string | undefined): LogLevel | undefined {
    switch (level?.toLowerCase()) {
      case 'off':
        return LogLevel.OFF
      case 'fatal':
        return LogLevel.FATAL
      case 'error':
        return LogLevel.ERROR
      case 'warn':
        return LogLevel.WARN
      case 'info':
        return LogLevel.INFO
      case 'debug':
        return LogLevel.DEBUG
      default:
        return undefined
    }
  }

  private shouldLog (level: LogLevel): boolean {
    return level <= this.logLevel
  }

  private log (level: LogLevel, message: string): void {
    if (this.shouldLog(level)) {
      if (this.logCallback !== undefined) {
        this.logCallback(level, message)
      } else {
        console.log(`[${LogLevel[level]}] ${message}`)
      }
    }
  }

  public debug (message: string): void {
    this.log(LogLevel.DEBUG, message)
  }

  public info (message: string): void {
    this.log(LogLevel.INFO, message)
  }

  public warn (message: string): void {
    this.log(LogLevel.WARN, message)
  }

  public error (message: string): void {
    this.log(LogLevel.ERROR, message)
  }

  public fatal (message: string): void {
    this.log(LogLevel.FATAL, message)
  }

  public getLogLevel (): LogLevel {
    return this.logLevel
  }

  public setLoggingLevel (level: LogLevel): void {
    this.logLevel = level
  }

  public configLoggingCallback (cb: LogCallback): void {
    this.logCallback = cb
  }
}
