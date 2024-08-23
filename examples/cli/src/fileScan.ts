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
 * @param caCert - full path name of CA certificate pem file for self hosted scanner server. null if using Trend scanner services.
 * @param tags - List of string to tag a scan
 * @param pml - Enable predictive machine learning detection
 * @param feedback - Enable Trend Micro Smart Protection Network's Smart Feedback
 * @param verbose - Flag to indicate whether return result in verbose format
 * @param digest - Flag to enable calculation of digests for cache search and result lookup
 */
const runFileScan = async (fileName: string, caCert: string, tags: string[], pml: boolean, feedback: boolean, verbose: boolean, digest: boolean): Promise<void> => {
  console.log(`\nScanning '${fileName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key, undefined, true, caCert)
    : new AmaasGrpcClient(amaasHostName, credent, undefined, true, caCert)

  loggerConfig(amaasGrpcClient)

  await amaasGrpcClient
    .scanFile(fileName, tags, pml, feedback, verbose, digest)
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
  const args = process.argv.slice();
  const fileToScan = args[2] || 'node_modules/@grpc/grpc-js/src/admin.ts';
  const caCert = args[3] || null;

  const tags = ['example', 'test']
  const predictive_machine_learning = false
  const smart_feedback = false
  const verbose = true
  const digest = true
  await runFileScan(fileToScan, caCert, tags, predictive_machine_learning, smart_feedback, verbose, digest)
})()
