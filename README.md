# Trend Vision One™ File Security Node.js SDK User Guide

Trend Vision One™ - File Security is a scanner app for files and cloud storage. This scanner can detect all types of malicious software (malware) including trojans, ransomware, spyware, and more. Based on fragments of previously seen malware, File Security detects obfuscated or polymorphic variants of malware.
File Security can assess any file type or size for malware and display real-time results. With the latest file reputation and variant protection technologies backed by leading threat research, File Security automates malware scanning.
File Security can also scan objects across your environment in any application, whether on-premises or in the cloud.

The Node.js software development kit (SDK) for Trend Vision One™ File Security empowers you to craft applications which seamlessly integrate with File Security. With this SDK you can perform a thorough scan of data and artifacts within your applications to identify potential malicious elements.
Follow the steps below to set up your development environment and configure your project, laying the foundation to effectively use File Security.

## Checking prerequisites

Before installing the SDK, ensure you have the following:

- Node.js 16.20.1+, 18.x or later
- Trend Vision One account associated with your region - for more information, see the [Trend Vision One account document](https://docs.trendmicro.com/en-us/documentation/article/trend-vision-one-accountspartfoundati).
- Custom role with File Security permissions

When you have all the prerequisites, continue with creating an API key.

## Creating an API Key

The File Security SDK requires a valid application programming interface (API) key provided as a parameter to the SDK client object. Trend Vision One API keys are associated with different regions. Refer to the region flag below to obtain a better understanding of the valid regions associated with the API key. For more information, see the [Trend Vision One API key documentation](https://docs.trendmicro.com/en-us/documentation/article/trend-vision-one-api-keys).

### Procedure

- Go to Administrations > API Keys.
- Click Add API Key.
- Configure the API key to use the role with the 'Run file scan via SDK' permission.
- Verify that the API key is associated with the region you plan to use.
- Set an expiry time for the API key and make a record of it for future reference.

## Installing the SDK

To install the SDK's Node.js package, run the following commands in your Node.js application folder.

```sh
npm install file-security-sdk
```

## Using File Security Node.js SDK

Using File Security Node.js SDK to scan for malware involves the following basic steps:

1. Create an AMaaS client instance by specifying preferred Vision One region where scanning should be done and a valid API key.
2. Replace `__YOUR_OWN_VISION_ONE_API_KEY__` and `__REGION__` with your actual API key and the desired region.
3. Invoke file scan method to scan the target data.
4. Parse the JSON response returned by the scan APIs to determine whether the scanned data contains malware or not.

### Steps

- Supply the AMaaSHostName and API Key to initiate a new instance of the AmaasGrpcClient.

```typescript
import { AmaasGrpcClient } from "file-security-sdk";
```

- Use a fully qualified domain name (FQDN) with or without a port -- Replace `__REGION__` with the region of your Trend Vision One account.

```typescript
const amaasHostName = "antimalware.__REGION__.cloudone.trendmicro.com:443";
```

- Use the region -- Replace `__REGION__` with the region of your Trend Vision One account.

```typescript
const amaasHostName = __REGION__;
```

- Replace `__YOUR_OWN_VISION_ONE_API_KEY__` with your own Trend Vision One API key.

```typescript
const key = __YOUR_OWN_VISION_ONE_API_KEY__;
```

- Create a new instance of the AmaasGrpcClient class using the preferred region and key.

```typescript
const scanClient = new AmaasGrpcClient(amaasHostName, key);
```

## Code Example

The following is an example of how to use the SDK to scan a file or buffer for malware and retrieve the scan results from our API.

```typescript
import { AmaasGrpcClient, LogLevel } from "file-security-sdk";
import { readFileSync } from "fs/promises";

// Use region. Replace __REGION__ with the region of your Vision One account
const amaasHostName = __REGION__;

const credent = __YOUR_OWN_VISION_ONE_API_KEY__;

let scanClient = undefined;

try {
  scanClient = new AmaasGrpcClient(amaasHostName, credent);

  const logCallback = (level: LogLevel, message: string): void => {
    console.log(`logCallback is called, level: ${level}, message: ${message}`);
  };
  scanClient.setLoggingLevel(LogLevel.DEBUG);
  scanClient.configLoggingCallback(logCallback);

  // Example of scanFile
  const fileToScan = "path/to/file.ext";
  const fileScanResult = await scanClient.scanFile(
  fileToScan, 
  ["tag1", "tag2", "tag3"],
  pml,
  feedback
  );
  console.log(`Number of malware found: ${result.scanResult}`); // Scan result handling

  // Example of scanBuffer
  const buff = await readFileSync(fileToScan);
  const pml = true
  const feedback = true
  const bufferScanResult = await scanClient.scanBuffer(
    "THE_FILE_NAME_OR_IDENTIFIER",
    buff,
    ["tag1", "tag2", "tag3"],
    pml,
    feedback
  );
  console.log(
    `Number of malware found in buffer: ${bufferScanResult.scanResult}`
  );
} catch (error) {
  // Error handling
  console.error("Error occurred:", error.message);
} finally {
  if (typeof scanClient !== "undefined") {
    scanClient.close();
  }
}
```

## API Reference

### `AmaasGrpcClient`

The AmaasGrpcClient class is the main class of the SDK and provides methods to interact with the API.

#### `constructor( amaasHostName: string, credent: string, timeout: number | undefined = 300, enableTLS: boolean | undefined = true)`

Create a new instance of the `AmaasGrpcClient` class.

**_Parameters_**

| Parameter     | Description                                                                                                                                                                                                                                          | Default value |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| amaasHostName | The region of your Vision One account. The region is the location where you acquire your api key. Value provided must be one of the Vision One regions, e.g. `ap-northeast-1`, `ap-south-1`, `ap-southeast-1`, `ap-southeast-2`, `eu-central-1`, `us-east-1`, etc. |               |
| credent       | Your own Vision One API Key.                                                                                                                                                                                                                         |               |
| timeout       | Timeout to cancel the connection to server in seconds.                                                                                                                                                                                               | 300           |
| enableTLS     | Enable or disable TLS. TLS should always be enabled when connecting to the File Security service. For more information, see the 'Ensuring Secure Communication with TLS' section.                                                                                                                                                            | true          |

**_Return_**
An AmaasGrpcClient instance

#### `scanFile(name: string, tags?: string[], pml: boolean = false, feedback: boolean = false): Promise<AmaasScanResultObject>`

Scan a file for malware and retrieves response data from the API.

**_Parameters_**

| Parameter | Description                                                                                                              | Default value |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | ------------- |
| name      | The name of the file with path of directory containing the file to scan.                                                 |               |
| tags      | The list of tags which can be used to tag the scan. Max size of tags list is 8. Max size of each tag is 63. |               |
| pml       | This flag is to enable Trend's predictive machine learning detection.                                                    | false         |
| feedback  | This flag is to enable Trend Micro Smart Protection Network's Smart Feedback.                                            | false         |

**_Return_**
A Promise that resolves to the API response data.

#### `scanBuffer(fileName: string, buff: Buffer, tags?: string[], pml: boolean = false, feedback: boolean = false): Promise<AmaasScanResultObject>`

Scan a buffer for malware and retrieves response data from the API.

**_Parameters_**

| Parameter | Description                                                                                                              | Default value |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | ------------- |
| fileName  | The name of the file or object the buffer is created from. The name is used to identify the buffer.                      | |
| buff      | The buffer to scan.                                                                                                      |               |
| tags      | The list of tags which can be used to tag the scan. Max size of tags list is 8. Max size of each tag is 63. |               |
| pml       | This flag is to enable Trend's predictive machine learning detection.                                                    | false         |
| feedback  | This flag is to enable Trend Micro Smart Protection Network's Smart Feedback.                                            | false         |

**_Return_**
A Promise that resolves to the API response data.

#### `close(): void`

Close connection to the AMaaS server.

**_Parameters_**
None

**_Return_**
void

#### `setLoggingLevel(level: LogLevel): void`

For configuring the SDK's active logging level. The change is applied globally to all AMaaS Client instances. Default level is `LogLevel.OFF`, corresponding to all logging disabled. If logging is enabled, unless custom logging is configured using `configLoggingCallback()` logs will be written to stdout.

**_Parameters_**

| Parameter        | Description                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| level (LogLevel) | Valid values are LogLevel.OFF, LogLevel.FATAL, LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, and LogLevel.DEBUG; default level is LogLevel.OFF |

---

**_Return_**
void

#### `configLoggingCallback(LogCallback: Function): void`

For setting up custom logging by provisioning the SDK with a custom callback function that is invoked whether the SDK wants to record a log.

**_Parameters_**

| Parameter   | Description                                                          |
| ----------- | -------------------------------------------------------------------- |
| LogCallback | A function with the type `(level LogLevel, message: string) => void` |

**_Return_**
void

### `AmaasScanResultObject`

The AmaasScanResultObject interface defines the structure of the response data that is retrieved from our API.
The following are the fields in the interface.

```typescript
interface AmaasScanResultObject {
  scanTimestamp: string; // Timestamp of the scan in ISO 8601 format
  version: string; // Scan result schema version
  fileName: string; // Name of the file scanned
  scanId: string; // ID of the scan
  scanResult: number; // Number of malwares found. A value of 0 means no malware was found
  foundMalwares: [
    // A list of malware names and the filenames found by AMaaS
    {
      fileName: string; // File name which found the malware
      malwareName: string; // Malware name
    }
  ];
}
```

### `LogLevel`

```typescript
enum LogLevel {
  OFF, // 0
  FATAL, // 1
  ERROR, // 2
  WARN, // 3
  INFO, // 4
  DEBUG, // 5
}
```

## Errors

The built-in JavaScript `Error` object with name "`Error`" will be thrown when error occurs.

### Common errors

The actual message in the following table may be vary in different environment.

| Sample Message                                                                  | Description and handling                                                                                                                                        |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error: Name resolution failed for target dns:{server_address}                   | There is a network issue. Please verify the network connection to AMaaS server, and make sure the server address specified in the `AmaasGrpcClient` is correct. |
| Error: Failed to create scan client. Could not parse target name ""             | The AMaaS server address is not set or is empty. Please make sure the server address specified in the `AmaasGrpcClient` is correct.                             |
| Error: You are not authenticated. Invalid C1 token or Api Key                   | The API key is invalid. Please make sure a correct Vision One Api key is used.                                                                                  |
| Error: Failed to open file. ENOENT: no such file or directory, stat {file_path} | The {file_path} specified in `scanFile` cannot be found. Please make sure the file exists and {file_path} specified is correct.                                 |
| Error: Failed to open file. EACCES: permission denied, open {file_path}         | There is a file access permission issue. Please make sure the SDK has read permission of the {file_path} specified in `scanFile`.                               |
| Error: Invalid region: {region}                                                 | The region is invalid. Please make sure a correct region is used.                                                                                               |

## Ensuring Secure Communication with TLS

The communication channel between the client program or SDK and the Trend Vision One™ File Security service is fortified with robust server-side TLS encryption. This ensures that all data transmitted between the client and Trend service remains thoroughly encrypted and safeguarded.
The certificate employed by server-side TLS is a publicly-signed certificate from Trend Micro Inc, issued by a trusted Certificate Authority (CA), further bolstering security measures.

The File Security SDK consistently adopts TLS as the default communication channel, prioritizing security at all times. It is strongly advised not to disable TLS in a production environment while utilizing the File Security SDK, as doing so could compromise the integrity and confidentiality of transmitted data.
