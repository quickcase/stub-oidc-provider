const debug = require('debug')('stub-oidc-provider:config');
const path = require('path');

const defaults = {
  CONFIG_FILE: path.join(__dirname, '/default/config.yml'),
  ISSUER: 'http://localhost:9000',
  USERS_FILE: path.join(__dirname, '/default/users.yml'),
};

const config = () => Object.entries(defaults)
                           .map(([key, defaultValue]) => {
                             const value = process.env[key];

                             if (value) {
                               debug(`Using ${key}: ${value}`);
                               return [key, value];
                             }

                             debug(`Using default ${key}: ${defaultValue}`);
                             return [key, defaultValue];
                           })
                           .reduce((acc, [key, value]) => Object.assign({}, acc, {[key]: value}), {});

module.exports = config;
