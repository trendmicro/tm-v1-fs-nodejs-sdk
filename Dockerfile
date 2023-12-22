# Build stage
FROM node:16.20.1-slim@sha256:f66adfa1694f8345d2ec4c2dedded87055be5182f62ac33032ea7b252b1b2963 as build_env

RUN useradd -m su-amaas

## Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    protobuf-compiler=3.6.1.3-2+deb10u1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

USER su-amaas

## Copy source codes and documents
COPY --chown=su-amaas:su-amaas package.json package-lock.json tsconfig.json LICENSE .eslintrc.json README.md /home/su-amaas/
COPY --chown=su-amaas:su-amaas protos /home/su-amaas/protos
COPY --chown=su-amaas:su-amaas src /home/su-amaas/src

WORKDIR /home/su-amaas

RUN npm ci

## Generate protobuf files
RUN npx grpc_tools_node_protoc \
    --js_out=import_style=commonjs,binary:./src/lib \
    --grpc_out=grpc_js:./src/lib \
    --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin \
    ./protos/scan.proto

RUN protoc \
    --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
    --ts_out=grpc_js:./src/lib \
    ./protos/scan.proto

RUN mkdir -p ./output

RUN npm run build

## Copy package.json and documents
RUN cp package.json LICENSE README.md ./output/

FROM build_env as unit_test

ARG TM_AM_LOG_LEVEL

COPY --chown=su-amaas:su-amaas jest.config.ts /home/su-amaas
COPY --chown=su-amaas:su-amaas __tests__ /home/su-amaas/__tests__

## Run tests
RUN TM_AM_LOG_LEVEL=${TM_AM_LOG_LEVEL} npm test

# Publish stage
FROM node:16.20.1-slim@sha256:f66adfa1694f8345d2ec4c2dedded87055be5182f62ac33032ea7b252b1b2963

RUN useradd -m su-amaas

ARG PACK_CMD=pack
ARG NPM_TOKEN

USER su-amaas

COPY --from=build_env --chown=su-amaas:su-amaas /home/su-amaas/output /home/su-amaas/output

WORKDIR /home/su-amaas/output

## Publish JavaScript node package
RUN npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN} && \
    npm ${PACK_CMD} && \
    npm config delete //registry.npmjs.org/:_authToken
