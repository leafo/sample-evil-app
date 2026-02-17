PRODUCT_NAME=Sample Evil App
BUILD_DIR=build
BUTLER?=butler
ITCH_TARGET?=leafo/sample-evil-app

.PHONY: all package publish publish-win32 publish-linux publish-osx

all: package publish

package:
	npm run package:win32
	npm run package:linux
	npm run package:darwin

publish: publish-win32 publish-linux publish-osx

publish-win32: package
	cp itch.toml '$(BUILD_DIR)/$(PRODUCT_NAME)-win32-x64/.itch.toml'
	$(BUTLER) push '$(BUILD_DIR)/$(PRODUCT_NAME)-win32-x64' '$(ITCH_TARGET):win32'

publish-linux: package
	cp itch.toml '$(BUILD_DIR)/$(PRODUCT_NAME)-linux-x64/.itch.toml'
	$(BUTLER) push '$(BUILD_DIR)/$(PRODUCT_NAME)-linux-x64' '$(ITCH_TARGET):linux'

publish-osx: package
	cp itch.toml '$(BUILD_DIR)/$(PRODUCT_NAME)-darwin-arm64/.itch.toml'
	$(BUTLER) push '$(BUILD_DIR)/$(PRODUCT_NAME)-darwin-arm64' '$(ITCH_TARGET):osx'
