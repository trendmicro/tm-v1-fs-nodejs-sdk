export interface AmaasScanResultObject {
  scanTimestamp: string
  version: string
  fileName: string
  scanId: string
  scanResult: number
  foundMalwares: [
    {
      fileName: string
      malwareName: string
    }
  ]
}
