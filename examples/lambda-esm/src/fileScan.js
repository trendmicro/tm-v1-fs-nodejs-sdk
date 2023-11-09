import { AmaasGrpcClient } from 'file-security-sdk'
import loggerConfig from './loggerConfig.js'

/**
 * Handle environment variables.
 */
const amaasHostName = process.env?.TM_AM_SERVER_ADDR ?? ''
const key = process.env?.TM_AM_AUTH_KEY ?? ''
const creds = {
  credsType: process.env?.TM_AM_AUTH_KEY_TYPE === 'token' ? 'token' : 'apikey',
  secret: key
}
const useKey = false

/**
 * Create a scan client instance using AmaasGrpcClient class.
 * Use AmaasGrpcClient.scanFile() to scan the file.
 * @async
 * @param {string} fileName - The file to scan.
 * @returns {Promise<void>} Promise object represents the result of the scan.
 */
const runFileScan = async (fileName) => {
  console.log(`\nScanning '${fileName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, creds)

  loggerConfig(amaasGrpcClient)

  await amaasGrpcClient
    .scanFile(fileName)
    .then(result => {
      console.log(`${JSON.stringify(result)}`)
    })
    .catch(err => {
      throw err
    })
    .finally(() => {
      amaasGrpcClient.close()
    })
}

export const handler = async () => {
  await runFileScan('index.js')

  return {
    statusCode: 200,
    body: JSON.stringify('AMAAS Node Client SDK Scan Done!')
  }
}
