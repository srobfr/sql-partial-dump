help: ## Shows an help screen
	@echo "SQL Partial dumper"
	@echo "Defined make targets :"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

dev-install: ## Sets up the project on local environment
	npm i

dev: ## Runs the typescript code
	./node_modules/.bin/ts-node src/index.ts

dev-debug: ## Runs the typescript code (with all debug traces)
	DEBUG=* ./node_modules/.bin/ts-node src/index.ts

build: ## Builds sql-partial-dump for distribution
	./node_modules/.bin/tsc

run: build ## Builds then runs the compiled code
	node dist/index.js
