const debug = require('debug')('stub-oidc-provider:oidc');
const path = require('path');
const Provider = require('oidc-provider');
const loadFile = require('./file-loader');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '/default/config.yml');

const loadConfig = loadFile;

const defaultConfig = () => loadConfig(DEFAULT_CONFIG_PATH);

const mergeConfigs = (config, overrides) => Object.assign({}, defaultConfig(), config, overrides);

const provider = (config) => (issuer, findAccount) => new Provider(issuer, mergeConfigs(config, {findAccount}));

const fromPath = (path) => provider(loadConfig(path));

const Oidc = {
  provider,
  fromPath,
}

module.exports = Oidc;
