# Build stage
FROM node:20.19.0-slim@sha256:5cfa999422613d3b34f766cbb814d964cbfcb76aaf3607e805da21cccb352bac as build_env

RUN useradd -m su-amaas

USER su-amaas

## Copy source codes and documents
COPY --chown=su-amaas:su-amaas package.json package-lock.json tsconfig.json LICENSE .eslintrc.json README.md /home/su-amaas/
COPY --chown=su-amaas:su-amaas protos /home/su-amaas/protos
COPY --chown=su-amaas:su-amaas src /home/su-amaas/src

WORKDIR /home/su-amaas

RUN npm ci

RUN mkdir -p ./src/lib/protos

## Generate protobuf files with protobuf-ts
RUN npx protoc \
    --ts_out ./src/lib/protos \
    --ts_opt generate_dependencies \
    --ts_opt long_type_string \
    --ts_opt output_javascript \
    --ts_opt client_grpc1 \
    --proto_path ./protos \
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
FROM node:20.19.0-slim@sha256:5cfa999422613d3b34f766cbb814d964cbfcb76aaf3607e805da21cccb352bac

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
