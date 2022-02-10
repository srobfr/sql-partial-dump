help: ## Shows an help screen
	@echo "SQL Partial dumper"
	@echo "Defined make targets :"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install dependancies
	npm i

build: ## Builds the distributable code
	./node_modules/.bin/tsc
	chmod +x dist/index.js

watch: ## Builds the distributable code when a source is changed
	$(MAKE) build
	inotifywait -r src/ -e modify -m | while read l; do \
		$(MAKE) build; \
	done

publish-patch: install build
	npm version patch
	npm publish
	git push origin "$$(git rev-parse --abbrev-ref HEAD)"
	git push origin --tags
