# Examples of Using Trend Vision One File Security Node.js SDK

Follow the instructions below to build and run example code.

## Prerequisites

- NodeJS version 16.20.1+, 18.x or above
- A Trend Vision One API key - for more information, see the [Trend Vision One API key documentation](https://docs.trendmicro.com/en-us/enterprise/trend-vision-one/administrative-setti/accountspartfoundati/api-keys.aspx).

## Build and Run Examples

The following instructions assumes you are at the `<top level>/client/ts/examples` directory.

### CLI / CLI-ESM

1. Navigate to `'cli/'` or `'cli-esm/'`.

   ```sh
   cd cli/
   ```
   or
   ```sh
   cd cli-esm/
   ```

2. Export the following environment variables. Replace `__YOUR_VISION_ONE_API_KEY_REGION__` and `__YOUR_VISION_ONE_API_KEY__` with your own API key region and Vision One API key.

   ```sh
   export TM_AM_SERVER_ADDR=fs-sdk-__YOUR_VISION_ONE_API_KEY_REGION__.xdr.trendmicro.com:443
   export TM_AM_AUTH_KEY=__YOUR_VISION_ONE_API_KEY__
   ```

3. To configuring the SDK's active logging level, export the following environment. The change is applied globally to all AMaaS Client instances. Valid values are OFF, FATAL, ERROR, WARN, INFO, and DEBUG; default level is OFF. Replace `__LOG_LEVEL__` with one of the valid values.

   ```sh
   export TM_AM_LOG_LEVEL=__LOG_LEVEL__
   ```

4. Install dependencies. This will install the SDK and all required devDependencies.

   ```sh
   npm install
   ```

5. Build the example using one of the following commands:

   - fileScan:

   ```sh
   SOURCE=fileScan.ts npm run build # cli
   ```

   ```sh
   SOURCE=fileScan.js npm run build # cli-esm
   ```

   - bufferScan:

   ```sh
   SOURCE=bufferScan.ts npm run build # cli
   ```

   ```sh
   SOURCE=bufferScan.js npm run build # cli-esm
   ```

   - batchFileScan:

   ```sh
   SOURCE=batchFileScan.ts npm run build # cli
   ```

   ```sh
   SOURCE=batchFileScan.js npm run build # cli-esm
   ```

   - batchBufferScan
   ```sh
   SOURCE=batchBufferScan.ts npm run build # cli
   ```

   ```sh
   SOURCE=batchBufferScan.js npm run build # cli-esm
   ```

6. Run the example using following command:

   ```sh
   npm run client
   ```

### LAMBDA / LAMBDA-ESM

1. Create a new Lambda function. Go to the AWS Lambda console and click "Create function". Choose "Author from scratch" and fill in the following details:

- Function name: Choose a name for your function
- Runtime: Node.js 18.x or above
- Handler: index.handler
- Architecture: x86_64 or arm64

2. Set up environment variables for your function by clicking on "Configuration" and then "Environment variables". Add the following keys and values. Replace `__YOUR_VISION_ONE_API_KEY_REGION__` and `__YOUR_VISION_ONE_API_KEY__` with your own API key region and Vision One API key.

   |Key|Value|Default value|
   |---|---|---|
   |TM_AM_SERVER_ADDR|fs-sdk-`__YOUR_VISION_ONE_API_KEY_REGION__`.xdr.trendmicro.com:443|
   |TM_AM_AUTH_KEY|`__YOUR_VISION_ONE_API_KEY__`|
   |TM_AM_LOG_LEVEL|FATAL \| ERROR \| WARN \| INFO \| DEBUG| OFF |

3. Navigate to 'lambda/' or 'lambda-esm/'.

   ```sh
   cd lambda/
   ```
   or

   ```sh
   cd lambda-esm/
   ```

4. Install dependencies. This will install the SDK and all required devDependencies.

   ```sh
   npm install
   ```

5. You should have the a 7-Zip executable (v16.02 or greater) available in your system.

    - On Debian and Ubuntu install the p7zip-full package or use 7-Zip 21.02 alpha or higher
    - On Mac OSX use Homebrew brew install p7zip
    - On Windows get 7-Zip from 7-Zip download page.
6. Build the example by running one of the following commands:

   - fileScan:

   ```sh
   SOURCE=fileScan.ts npm run build # lambda
   ```

   ```sh
   SOURCE=fileScan.js npm run build  # lambda-esm
   ```

   - bufferScan:

   ```sh
   SOURCE=bufferScan.ts npm run build # lambda
   ```

   ```sh
   SOURCE=bufferScan.js npm run build # lambda-esm
   ```

   - bufferS3Scan:

   ```sh
   SOURCE=bufferS3Scan.ts npm run build # lambda
   ```

   ```sh
   SOURCE=bufferS3Scan.js npm run build # lambda-esm
   ```

   - batchFileScan:

   ```sh
   SOURCE=batchFileScan.ts npm run build # lambda
   ```

   ```sh
   SOURCE=batchFileScan.js npm run build # lambda-esm
   ```

   - batchBufferScan:

   ```sh
   SOURCE=batchBufferScan.ts npm run build # lambda
   ```

   ```sh
   SOURCE=batchBufferScan.js npm run build # lambda-esm
   ```

   An archive file `index.zip` which contains index.js and node_modules will be generated under the 'dist/' directory.

7. Deploy `dist/index.zip` to your Lambda function created in step 1 by clicking on "Function code" and then "Upload from" and selecting the index.zip file.

8. Create a test for your function by clicking on "Configure test events" and then "Create new test event". Choose "Hello World" as the template and click "Create". Click "Test" to run the test.
