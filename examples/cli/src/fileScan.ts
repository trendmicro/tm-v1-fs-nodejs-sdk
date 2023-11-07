import { AmaasGrpcClient, AmaasCredentials } from 'cloudone-vsapi'
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
 */
const runFileScan = async (fileName: string): Promise<void> => {
  console.log(`\nScanning '${fileName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, credent)

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

void (async () => {
  // Examples of using AmaasGrpcClient
  await runFileScan('node_modules/@grpc/grpc-js/src/admin.ts')
})()
