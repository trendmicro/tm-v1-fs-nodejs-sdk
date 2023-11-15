# Trend Vision One File Security Node.js SDK User Guide

The Trend Vision One File Security Node.js SDK empowers developers to craft applications seamlessly integrating with the cloud-based Trend Vision One anti-malware file scanning service. This ensures a thorough scan of data and artifacts within the applications, identifying potential malicious elements.

This guide outlines the steps to establish your development environment and configure your project, laying the foundation for utilizing the File Security Node.js SDK effectively.

## Prerequisites

Before installing the SDK, ensure that the following prerequisites are met:

- NodeJS version 16.20.1+, 18.x or above
- Trend Vision One account with a chosen region - for more information, see the [Trend Vision One account document](https://docs.trendmicro.com/en-us/enterprise/trend-micro-xdr-help/Home).
- A Trend Vision One API key - for more information, see the [Trend Vision One API key documentation](https://docs.trendmicro.com/en-us/enterprise/trend-vision-one/administrative-setti/accountspartfoundati/api-keys.aspx).

## Installation

To install the SDK's NodeJS package, run the following commands in your NodeJS application folder.

```sh
npm install file-security-sdk
```

## Authentication

To authenticate with the API, you need an Trend Vision One API key. Sign up for a [Trend Vision One account](https://docs.trendmicro.com/en-us/enterprise/trend-vision-one.aspx) and follow the instructions on [Manage Trend Vision One API Keys](https://docs.trendmicro.com/en-us/enterprise/trend-vision-one/administrative-setti/accountspartfoundati/api-keys.aspx) to obtain an API key.

When creating a Trend Vision One account, choose a region for the account. All of the account data, as well as the security data for the Trend Vision One security services in the account, is stored in that region. For more information, see the [Trend Vision One regions documentation](https://docs.trendmicro.com/en-us/enterprise/trend-vision-one.aspx).

### Usage

To initiate a new instance of the AmaasGrpcClient, we need to supply the AMaaSHostName and Vision One API Key.

```typescript
import { AmaasGrpcClient } from "file-security-sdk";

// Use FQDN with or without port. Replace __REGION__ with the region of your Vision One account
const amaasHostName = "antimalware.__REGION__.cloudone.trendmicro.com:443";

// Use region. Replace __REGION__ with the region of your Vision One account
const amaasHostName = __REGION__;

// Replace __YOUR_OWN_VISION_ONE_API_KEY__ with your own Visioin One API key
const key = __YOUR_OWN_VISION_ONE_API_KEY__;

// Create a new instance of the AmaasGrpcClient class using the key
const scanClient = new AmaasGrpcClient(amaasHostName, key);
```

## API Reference

### `AmaasGrpcClient`

The AmaasGrpcClient class is the main class of the SDK and provides methods to interact with the API.

#### `constructor( amaasHostName: string, credent: string, timeout: number | undefined = 180, enableTLS: boolean | undefined = true)`

Create a new instance of the `AmaasGrpcClient` class.

**_Parameters_**

| Parameter     | Description                                                                              | Default value |
| ------------- | ---------------------------------------------------------------------------------------- | ------------- |
| amaasHostName | The AMaaS server address or the region of your Vision One account. The region is the location where you acquire your api key.  Value provided must be one of the Vision One regions, e.g. `us-east-1`, `eu-central-1`, `ap-northeast-1`, `ap-southeast-2`, `ap-southeast-1`, etc.                                                               |               |
| credent       | Your own Vision One API Key.                                                              |               |
| timeout       | Timeout to cancel the connection to server in seconds.                                   | 180           |
| enableTLS     | Enable or disable TLS. TLS should always be enabled when connecting to the AMaaS server. | true          |

**_Return_**
An AmaasGrpcClient instance

#### `scanFile(name: string, tags?: string[]): Promise<AmaasScanResultObject>`

Scan a file for malware and retrieves response data from the API.

**_Parameters_**

| Parameter | Description                                                              | Default value |
| --------- | ------------------------------------------------------------------------ | ------------- |
| name      | The name of the file with path of directory containing the file to scan. |               |
| tags      | `(Optional)` The list of tags which can be used to tag the scan.  Max size of tags list is 8. Max size of each tag is 63.|               |

**_Return_**
A Promise that resolves to the API response data.

#### `scanBuffer(fileName: string, buff: Buffer, tags?: string[]): Promise<AmaasScanResultObject>`

Scan a buffer for malware and retrieves response data from the API.

**_Parameters_**

| Parameter | Description                                                                                         | Default value |
| --------- | --------------------------------------------------------------------------------------------------- | ------------- |
| fileName  | The name of the file or object the buffer is created from. The name is used to identify the buffer. |               |
| buff      | The buffer to scan.                                                                                 |               |
| tags      | `(Optional)` The list of tags which can be used to tag the scan. Max size of tags list is 8. Max size of each tag is 63.|               |

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
  scanTimestamp: string        // Timestamp of the scan in ISO 8601 format
  version: string              // Scan result schema version
  fileName: string             // Name of the file scanned
  scanId: string               // ID of the scan
  scanResult: number           // Number of malwares found. A value of 0 means no malware was found
  foundMalwares: [             // A list of malware names and the filenames found by AMaaS
    {
      fileName: string; // File name which found the malware
      malwareName: string; // Malware name
    },
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

## Code Example

The following is an example of how to use the SDK to scan a file or buffer for malware and retrieve the scan results from our API.

```typescript
import { AmaasGrpcClient, LogLevel } from "file-security-sdk";
import { readFileSync } from "fs/promises";

// Use FQDN with or without port. Replace __REGION__ with the region of your Vision One account
const amaasHostName = "antimalware.__REGION__.cloudone.trendmicro.com:443";

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
  const fileScanResult = await scanClient.scanFile(fileToScan, ['tag1', 'tag2', 'tag3']);
  console.log(`Number of malware found: ${result.scanResult}`); // Scan result handling

  // Example of scanBuffer
  const buff = await readFileSync(fileToScan);
  const bufferScanResult = await scanClient.scanBuffer(
    "THE_FILE_NAME_OR_IDENTIFIER",
    buff,
    ['tag1', 'tag2', 'tag3']
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

## Errors

The built-in JavaScript `Error` object with name "`Error`" will be thrown when error occurs.

### Common errors

The actual message in the following table may be vary in different environment.

| Sample Message                                                                  | Description and handling                                                                                                                                        |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error: Name resolution failed for target dns:{server_address}                   | There is a network issue. Please verify the network connection to AMaaS server, and make sure the server address specified in the `AmaasGrpcClient` is correct. |
| Error: Failed to create scan client. Could not parse target name ""             | The AMaaS server address is not set or is empty. Please make sure the server address specified in the `AmaasGrpcClient` is correct.                             |
| Error: You are not authenticated. Invalid C1 token or Api Key                   | The API key is invalid. Please make sure a correct Vision One Api key is used.                                                                   |
| Error: Failed to open file. ENOENT: no such file or directory, stat {file_path} | The {file_path} specified in `scanFile` cannot be found. Please make sure the file exists and {file_path} specified is correct.                                 |
| Error: Failed to open file. EACCES: permission denied, open {file_path}         | There is a file access permission issue. Please make sure the SDK has read permission of the {file_path} specified in `scanFile`.                               |
| Error: Invalid region: {region}                                                 | The region is invalid. Please make sure a correct region is used.                               |
