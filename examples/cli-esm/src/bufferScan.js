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
 * runBufferScan function
 *
 * Create a scan client instance using AmaasGrpcClient class. Store the
 * content of a file in buffer and use AmaasGrpcClient.scanBuffer() to
 * scan it.
 * @async
 * @function runBufferScan
 * @param {string} fileName
 * @returns {Promise<void>}
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

void (async () => {
  // Examples of using AmaasGrpcClient
  await runBufferScan('node_modules/@grpc/grpc-js/src/admin.ts')
})()
