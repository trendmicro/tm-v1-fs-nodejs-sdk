import { readFileSync } from 'fs'
import { AmaasGrpcClient } from 'cloudone-vsapi'
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
 * Create a scan client instance using AmaasGrpcClient class. Store the
 * content of a file in buffer and use AmaasGrpcClient.scanBuffer() to
 * scan it.
 * @async
 * @param {string} fileName - The file to scan.
 * @returns {Promise<void>} Promise object represents the result of the scan.
 */
const runBufferScan = async (fileName) => {
  console.log(`\nScanning buffer '${fileName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, creds)

  loggerConfig(amaasGrpcClient)

  const buff = readFileSync(fileName)
  await amaasGrpcClient
    .scanBuffer(fileName, buff)
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
  await runBufferScan('index.js')

  return {
    statusCode: 200,
    body: JSON.stringify('AMAAS Node Client SDK Scan Done!')
  }
}
