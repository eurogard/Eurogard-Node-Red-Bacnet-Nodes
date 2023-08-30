##
# eurogard-nodered-bacnet-node
#
# @file Makefile
# @version 0.1


help: ## Show this help
	@printf '\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n' && egrep '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

run-dev: ## run docker container exposing node-red at port 1880
	docker-compose -f docker/docker-compose-dev.yaml up --force-recreate  -d

local-install: ## install bacnet nodes to the local node-red installation
	npm install;

local-test: ## run tests on local node-red installation
	npm test;

enter: ## enter shell of the docker container
	docker compose -f docker/docker-compose-dev.yaml exec nodered-bacnetws-dev bash

clean: ## shutdown docker container and remove node_modules
	docker compose down
	rm -rf node_modules

build-dev: ## build from docker-compose file -> docker-compose build
	@docker-compose -f docker/docker-compose-dev.yaml build

# end
