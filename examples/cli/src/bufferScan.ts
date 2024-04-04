import { readFileSync } from 'fs'
import { AmaasGrpcClient, AmaasCredentials } from 'file-security-sdk'
import loggerConfig from './loggerConfig'

/**
 * Handle environment variables.
 */
const amaasHostName = process.env?.TM_AM_SERVER_ADDR ?? ''
const key = process.env?.TM_AM_AUTH_KEY ?? ''

const credent: AmaasCredentials = {
  credentType: process.env?.TM_AM_AUTH_KEY_TYPE === 'token' ? 'token' : 'apikey',
  secret: key
}

const useKey = false

/**
 * runBufferScan function
 *
 * Create a scan client instance using AmaasGrpcClient class. Store the
 * content of a file in buffer and use AmaasGrpcClient.scanBuffer() to
 * scan it.
 *
 * @param fileName - Name of the file to scan
 * @param tags - List of string to tag a scan
 * @param pml - Enable predictive machine learning detection
 * @param feedback: Enable Trend Micro Smart Protection Network's Smart Feedback
 */
const runBufferScan = async (fileName: string, tags: string[], pml: boolean, feedback: boolean): Promise<void> => {
  console.log(`\nScanning buffer '${fileName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, credent)

  loggerConfig(amaasGrpcClient)

  const buff = readFileSync(fileName)
  await amaasGrpcClient
    .scanBuffer(fileName, buff, tags, pml, feedback)
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
