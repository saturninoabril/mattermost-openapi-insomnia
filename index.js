#!/usr/bin/env node
const https = require('https');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const meta = require('./package');

const MATTERMOST_API_YAML = 'https://api.mattermost.com/static/mattermost-openapi-v4.yaml';
const DOWNLOADED_FILE = 'openapi/mattermost_openapi_v4.yaml';
const OUTPUT_DIRECTORY = 'dist';
const OUTPUT_FILE = 'mattermost_openapi_v4_insomnia.json';

const downloadApiFile = function(url, dest, cb) {
    const file = fs.createWriteStream(dest);

    https
        .get(url, function(response) {
            response.pipe(file);
            file.on('finish', function() {
                file.close(cb);
            });
        })
        .on('error', function(err) {
            // Handle errors
            fs.unlink(dest);
            if (cb) cb(err.message);
        });
};

const pathNormalizer = function pathNormalizer() {
    const capturedEnvironmentVars = new Set();
    pathNormalizer.capturedEnvironmentVars = capturedEnvironmentVars;
    const re = /{([^}]+)/g;
    return (path) => {
        return path.replace(re, (match, captured) => {
            capturedEnvironmentVars.add(captured);
            return `{{ ${captured} }`;
        });
    };
};

const normalizePath = pathNormalizer();

function generateJsonApi(routes) {
    const groups = new Set();
    const resources = [];
    let reqCounter = 0;

    Object.keys(routes).forEach((p) => {
        const route = routes[p];

        Object.entries(route).forEach(([method, perRoute]) => {
            perRoute.tags.forEach((t) => groups.add(t));

            let body = {};
            const parameters = [];
            perRoute.parameters &&
                perRoute.parameters.forEach((param) => {
                    if (param.name === 'body' && param.schema.required) {
                        const bodyText = {};
                        param.schema.required.forEach((b) => {
                            body.mimeType = 'application/json';
                            bodyText[b] = b;
                        });

                        body.text = JSON.stringify(bodyText);
                    } else if (param.name === 'path') {
                        parameters.push({name: param.name, value: param.name});
                    }
                });

            const id = `__REQ_${reqCounter}__`;

            perRoute.tags.forEach((tag) => {
                resources.push({
                    _id: id,
                    _type: 'request',
                    name: perRoute.summary,
                    description: `${perRoute.description}`,
                    authentication: {
                        token: '{{ mattermost_token }}',
                        type: 'bearer',
                    },
                    method,
                    url: `{{ mattermost_api_root }}${normalizePath(p)}`,
                    body,
                    headers: [],
                    parameters,
                    tag,
                });

                reqCounter += 1;
            });
        });
    });

    const rootRequestGroup = {
        parentId: '__WORKSPACE_ID__',
        _id: '__FLD_1__',
        _type: 'request_group',
        name: 'Mattermost REST v4 API',
    };

    const environment = {
        parentId: '__WORKSPACE_ID__',
        _id: '__ENV_1__',
        _type: 'environment',
        name: 'Base Environment',
        data: {
            mattermost_api_root: 'http://localhost:8065/api/v4',
            mattermost_token: '',
        },
    };

    const requestGroups = [];
    const groupParent = {};
    Array.from(groups)
        .sort(compareStrings)
        .forEach((group, index) => {
            // Add a new request group
            const parentId = `__FLD_${index + 2}__`;
            requestGroups.push({
                parentId: rootRequestGroup._id,
                _id: parentId,
                _type: 'request_group',
                name: group,
            });
            groupParent[group] = parentId;
        });

    const modifiedResources = resources.map((r) => {
        r.parentId = groupParent[r.tag];
        return r;
    });

    // Destination for output
    const destination = path.normalize(path.join(__dirname, OUTPUT_DIRECTORY, OUTPUT_FILE));

    // Add captured environment variables to environment
    for (const env of pathNormalizer.capturedEnvironmentVars) {
        if (env.match(/^([a-zA-Z_]+)$/) !== null) {
            Object.assign(environment.data, {[env]: env});
        }
    }

    const data = {
        _type: 'export',
        __export_format: 3,
        __export_date: new Date(),
        __export_source: `${meta.name}:${meta.version}`,
        resources: [rootRequestGroup]
            .concat(environment)
            .concat(requestGroups)
            .concat(modifiedResources),
    };

    // Write output straight to file
    const output = JSON.stringify(data, null, 2);
    fs.writeFileSync(destination, output);
}

function compareStrings(a, b) {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower < bLower) {
        return -1;
    }
    if (aLower > bLower) {
        return 1;
    }

    return 0;
}

function build() {
    downloadApiFile(MATTERMOST_API_YAML, DOWNLOADED_FILE, (err) => {
        if (err) {
            throw err;
        }

        const downloadedFile = yaml.safeLoad(
            fs.readFileSync(path.resolve(__dirname, DOWNLOADED_FILE), 'utf8'),
        );
        generateJsonApi(downloadedFile.paths);
    });
}

build();
