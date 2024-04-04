import { readFileSync } from 'fs'
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
 * runBufferScan function
 *
 * Create a scan client instance using AmaasGrpcClient class. Store the
 * content of a file in buffer and use AmaasGrpcClient.scanBuffer() to
 * scan it.
 * @async
 * @function runBufferScan
 * @param {string} fileName
 * @param {string[]} tags
 * @param {boolean} pml
 * @param {boolean} smart_feedback
 * @returns {Promise<void>}
 */
const runBufferScan = async (fileName, tags, pml, smart_feedback) => {
  console.log(`\nScanning buffer '${fileName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, creds)

  loggerConfig(amaasGrpcClient)

  const buff = readFileSync(fileName)
  await amaasGrpcClient
    .scanBuffer(fileName, buff, tags, pml, smart_feedback)
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
  // Examples of using AmaasGrpcClient with tags and TrendX with smart feedback
  const tags = ['example', 'test']
  const predictive_machine_learning = true
  const smart_feedback = true
  await runBufferScan('node_modules/@grpc/grpc-js/src/admin.ts', tags, predictive_machine_learning, smart_feedback)
})()
