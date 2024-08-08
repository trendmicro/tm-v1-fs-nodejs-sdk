export interface AmaasScanResultObject {
  schemaVersion: string
  scannerVersion: string
  scanResult: number
  scanId: string
  scanTimestamp: string
  fileName: string
  foundMalwares?: [
    {
      fileName: string
      malwareName: string
    }
  ]
  foundErrors?: [
    {
      name: string
      description: string
    }
  ]
  fileSHA1: string
  fileSHA256: string
}
