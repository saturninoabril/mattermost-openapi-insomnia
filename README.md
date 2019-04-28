# Mattermost Open API for Insomnia ![CircleCI branch](https://img.shields.io/circleci/project/github/saturninoabril/mattermost-openapi-insomnia/master.svg)

A complete set of [Mattermost Open API](https://api.mattermost.com/) route specifications that can be imported straight into [Insomnia REST Client](https://insomnia.rest/).

This script directly downloads [mattermost-openapi-v4.yaml](https://api.mattermost.com/static/mattermost-openapi-v4.yaml) and then generate Insomnia-compatible resources out of it.

## Build the resource
```
$ npm install
$ npm run build
```

## Usage

Import directly into Insomnia, via `Workspace` :arrow_right: `Import/Export` :arrow_right: `Import Data` :arrow_right: `From URL` and entering **`https://raw.githubusercontent.com/saturninoabril/mattermost-openapi-insomnia/master/dist/mattermost_openapi_v4_insomnia.json`**:

## Modify [base environment](https://support.insomnia.rest/article/18-environment-variables):
- `mattermost_token`: Add your token to authorize access to routes.
- `mattermost_api_root`: Set by default to `http://localhost:8065/api/v4` but can also change to remotely access your Mattermost instance.
- modify other parameters as needed in base environment
