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
 * runFileScan function
 *
 * Create a scan client instance using AmaasGrpcClient class.
 * Use AmaasGrpcClient.scanFile() to scan a file.
 *
 * @param fileName - Name of the file to scan
 * @param tags - List of string to tag a scan
 * @param pml - Enable predictive machine learning detection
 * @param feedback - Enable Trend Micro Smart Protection Network's Smart Feedback
 * @param verbose - Flag to indicate whether return result in verbose format
 */
const runFileScan = async (fileName: string, tags: string[], pml: boolean, feedback: boolean, verbose: boolean): Promise<void> => {
  console.log(`\nScanning '${fileName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, credent)

  loggerConfig(amaasGrpcClient)

  await amaasGrpcClient
    .scanFile(fileName, tags, pml, feedback, verbose)
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
  const verbose = true
  await runFileScan('node_modules/@grpc/grpc-js/src/admin.ts', tags, predictive_machine_learning, smart_feedback, verbose)
})()
