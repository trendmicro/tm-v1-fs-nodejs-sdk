export interface AmaasScanResultVerbose {
  scanType: string
  objectType: string
  timestamp: {
    start: string
    end: string
  }
  schemaVersion: string
  scannerVersion: string
  fileName: string
  rsSize: number
  scanId: string
  accountId: string
  result: {
    atse: {
      elapsedTime: number
      fileType: number
      fileSubType: number
      version: {
        engine: string
        lptvpn: number
        ssaptn: number
        tmblack: number
        tmwhite: number
        macvpn: number
      }
      malwareCount: number
      malware: Array<
        {
          name: string
          fileName: string
          type: string
          fileType: number
          fileTypeName: string
          fileSubType: number
          fileSubTypeName: string
        }
      > | null
      error: Array<
        {
          code: number
          message: string
        }
      > | null
      fileTypeName: string
      fileSubTypeName: string
    }
    trendx?: {
      elapsedTime: number
      fileType: number
      fileSubType: number
      version: {
        engine: string
        tmblack: number
        tmwhite: number
        trendx: number
      }
      malwareCount: number
      malware: Array<
        {
          name: string
          fileName: string
          type: string
          fileType: number
          fileTypeName: string
          fileSubType: number
          fileSubTypeName: string
        }
      > | null
      error: Array<
        {
          code: number
          message: string
        }
      > | null
      fileTypeName: string
      fileSubTypeName: string
    }
    tap?: {
      error: Array<
        {
          code: number
          message: string
        }
      > | null
    }
  }
  tags?: [ string ]
  fileSHA1: string
  fileSHA256: string
  appName: string
}
