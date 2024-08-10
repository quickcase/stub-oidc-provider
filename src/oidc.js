const debug = require('debug')('stub-oidc-provider:oidc');
const path = require('path');
const Provider = require('oidc-provider');
const loadFile = require('./file-loader');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '/default/config.yml');

const loadConfig = loadFile;

const defaultConfig = () => loadConfig(DEFAULT_CONFIG_PATH);

const mergeConfigs = (config, overrides) => Object.assign({}, defaultConfig(), config, overrides);

/**
 * When extra claims are requested in config, read them from user account and add them to the token.
 */
const extraAccessTokenClaims = (findAccount, extraClaims) => async (ctx, token) => {
  if (!extraClaims?.length) {
    // No extra claims requested
    return {};
  }

  const account = await findAccount(ctx, token.accountId);
  const claims = await account.claims();

  return Object.fromEntries(
    extraClaims.map(claim => [claim, claims.hasOwnProperty(claim) ? claims[claim] : ''])
  );
};

const provider = (config) => (issuer, findAccount) => new Provider(
  issuer,
  mergeConfigs(config, {
    findAccount,
    extraAccessTokenClaims: extraAccessTokenClaims(findAccount, config.extraAccessTokenClaims),
  })
);

const fromPath = (path) => provider(loadConfig(path));

const Oidc = {
  provider,
  fromPath,
}

module.exports = Oidc;
