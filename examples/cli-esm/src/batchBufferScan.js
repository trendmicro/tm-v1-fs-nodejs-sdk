import { readdirSync, readFileSync } from 'fs'
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
 * runConcurrentBufferScan function
 *
 * Create a scan client instance using AmaasGrpcClient class.
 * Store content of file in buffer before scanning. Run
 * AmaasGrpcClient.scanBuffer() concurrently to scan files under
 * a directory.
 * @async
 * @function runConcurrentBufferScan
 * @param {string} directoryName
 * @returns {Promise<void>}
 */
const runConcurrentBufferScan = async (directoryName) => {
  console.log(`\nScanning buffer '${directoryName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, creds)

  loggerConfig(amaasGrpcClient)

  if (directoryName.charAt(directoryName.length - 1) !== '/') {
    directoryName += '/'
  }
  const filesToScan = readdirSync(directoryName, { withFileTypes: true })
    .filter(item => !item.isDirectory())
    .map(item => `${directoryName}${item.name}`)
  const actions = filesToScan.map(async fileName => {
    const buff = readFileSync(fileName)
    return await amaasGrpcClient.scanBuffer(fileName, buff)
  })
  await Promise.all(actions)
    .then(results => {
      results.forEach(result => {
        console.log(JSON.stringify(result))
      })
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
  await runConcurrentBufferScan('node_modules/@grpc/grpc-js/src')
})()
