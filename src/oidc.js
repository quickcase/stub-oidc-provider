import path from 'path';
import * as oidc from 'oidc-provider';
import loadFile from './file-loader.js';

const __dirname = import.meta.dirname;
const DEFAULT_CONFIG_PATH = path.join(__dirname, '/default/config.yml');

const defaultConfig = () => loadFile(DEFAULT_CONFIG_PATH);

/**
 * When extra claims are requested in config, read them from user account and add them to the token.
*/
const extraTokenClaims = (findAccount, clients, extraClaims) => async (ctx, token) => {
  if (!extraClaims?.length) {
    // No extra claims requested
    return {};
  }

  const account = await findAccount(ctx, token.accountId);

  if (account) {
    const claims = await account.claims();

    return Object.fromEntries(
      extraClaims.map(claim => [claim, claims.hasOwnProperty(claim) ? claims[claim] : ''])
    );
  }

  // Load extra claims from client's `claims` property
  if (token.kind === 'ClientCredentials') {
    const claims = await clients.find(({client_id}) => client_id === token.clientId)?.claims;

    if (claims) {
      return Object.fromEntries(
        extraClaims.map(claim => [claim, claims.hasOwnProperty(claim) ? claims[claim] : ''])
      );
    }
  }
};

const loadExistingGrant = (config) => async (ctx) => {
  const grantId = ctx.oidc.result?.consent?.grantId
      || ctx.oidc.session.grantIdFor(ctx.oidc.client.clientId);

    if (grantId) {
      // keep grant expiry aligned with session expiry
      // to prevent consent prompt being requested when grant expires
      const grant = await ctx.oidc.provider.Grant.find(grantId);

      // this aligns the Grant ttl with that of the current session
      // if the same Grant is used for multiple sessions, or is set
      // to never expire, you probably do not want this in your code
      if (ctx.oidc.account && grant.exp < ctx.oidc.session.exp) {
        grant.exp = ctx.oidc.session.exp;

        await grant.save();
      }

      return grant;
    }

    // Grant all scopes, claims and APIs to avoid consent prompt
    if (process.env.PROMPT_CONSENT !== 'true') {
      const grant = new ctx.oidc.provider.Grant({
        clientId: ctx.oidc.client.clientId,
        accountId: ctx.oidc.session.accountId,
      });

      const client = config.clients.find((client) => client.client_id === ctx.oidc.client.clientId);

      grant.addOIDCScope(client.scope);
      grant.addOIDCClaims(Object.keys(client.claims ?? {}));

      Object.entries(config.apis ?? {})
            .forEach(([urn, api]) => grant.addResourceScope(urn, api.scope));

      await grant.save();

      return grant;
    }

    return undefined;
};

const provider = (config) => (issuer, findAccount) => new oidc.Provider(
  issuer,
  {
    ...defaultConfig(),
    ...config,
    findAccount,
    extraTokenClaims: extraTokenClaims(findAccount, config.clients, config.extraTokenClaims ?? config.extraAccessTokenClaims),
    features: {
      ...config.features,
      resourceIndicators: config.apis ? {
        enabled: true,
        defaultResource: (ctx, client, oneOf) => config.defaultApi,
        getResourceServerInfo: (ctx, resourceIndicator, client) => config.apis[resourceIndicator],
        useGrantedResource: (ctx, model) => true,
      } : undefined,
    },
    loadExistingGrant: loadExistingGrant(config),
  }
);

const fromPath = (path) => provider(loadFile(path));

const Oidc = {
  provider,
  fromPath,
}

export default Oidc;
