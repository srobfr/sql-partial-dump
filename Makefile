help: ## Shows an help screen
	@echo "SQL Partial dumper"
	@echo "Defined make targets :"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install dependancies
	npm i

build: ## Builds the distributable code
	-rm -rf dist
	./node_modules/.bin/tsc
	chmod +x dist/index.js

publish-patch: install build test
	npm version patch
	npm publish
	git push origin "$$(git rev-parse --abbrev-ref HEAD)"
	git push origin --tags
