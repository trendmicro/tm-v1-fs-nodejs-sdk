TM_AM_LOG_LEVEL ?= debug

IMAGE_NAME := amaas/amaas-grpc-ts-client:latest

VERSION_LOCATION := './VERSION'
VERSION := $(shell cat $(VERSION_LOCATION))

# BSD sed does not support --version argument, use this to check if the sed is GNU or BSD one
ifeq ($(shell sed --version >/dev/null 2>&1; echo $$?),0)
SED := sed -i
else
SED := sed -i ''
endif

all: clean build

build:
	$(SED) 's/__PACKAGE_VERSION__/$(VERSION)/' ./package.json
	docker build \
		-t $(IMAGE_NAME) \
		--build-arg NPM_TOKEN=$(NODE_AUTH_TOKEN) \
		--build-arg PACK_CMD=publish \
		--build-arg TM_AM_LOG_LEVEL=$(TM_AM_LOG_LEVEL) \
		.
	$(SED) 's/$(VERSION)/__PACKAGE_VERSION__/' ./package.json
test:
	docker build \
		--target unit_test \
		-t $(IMAGE_NAME) \
		--build-arg TM_AM_LOG_LEVEL=$(TM_AM_LOG_LEVEL) \
		.
	docker run --rm $(IMAGE_NAME) tar -cz coverage | tar xzf -

clean:
	-@docker rmi -f $(IMAGE_NAME) || true
	rm -rf output
	rm -rf coverage

.PHONY: all build test clean
