import {log} from 'debug';
import path from 'path';
import * as oidc from 'oidc-provider';
import loadFile from './file-loader.js';

const __dirname = import.meta.dirname;
const DEFAULT_CONFIG_PATH = path.join(__dirname, '/default/config.yml');

const defaultConfig = () => loadFile(DEFAULT_CONFIG_PATH);

/**
 * When extra claims are requested in config, read them from user account and add them to the token.
 */
const extraTokenClaims = (findAccount, extraClaims) => async (ctx, token) => {
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

const provider = (config) => (issuer, findAccount) => new oidc.Provider(
  issuer,
  {
    ...defaultConfig(),
    ...config,
    findAccount,
    extraTokenClaims: extraTokenClaims(findAccount, config.extraTokenClaims ?? config.extraAccessTokenClaims),
  }
);

const fromPath = (path) => provider(loadFile(path));

const Oidc = {
  provider,
  fromPath,
}

export default Oidc;
