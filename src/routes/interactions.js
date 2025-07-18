import {strict as assert} from 'node:assert';
import Debug from 'debug';
import express from 'express';

const debug = Debug('stub-oidc-provider:interactions');

const BADGE_STYLES = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];

const EXCLUDED_SCOPES = ['openid', 'offline_access'];
const EXCLUDED_CLAIMS = ['sub', 'sid', 'auth_time', 'acr', 'amr', 'iss'];

const noCache = (req, res, next) => {
  res.set('Pragma', 'no-cache');
  res.set('Cache-Control', 'no-cache, no-store');
  return next();
};

const hash = (str) => str.match(/[a-zA-Z0-9]/g).join('').toLowerCase();

const exclude = (...values) => (value) => !values.includes(value);

const formatAccount = ({id, email, claims}) => {
  const {name, ...otherClaims} = claims || {};
  return {
    id,
    name,
    email,
    claims: Object.keys(otherClaims).sort().map((key) => ({
      key,
      value: otherClaims[key],
      style: BADGE_STYLES[parseInt(hash(key), 36) % BADGE_STYLES.length],
    })),
  };
};

const interactions = (users, oidc) => {
  const router = express.Router();

  router.get('/:uid', noCache, async (req, res, next) => {
    try {
      const {uid, params, prompt} = await oidc.interactionDetails(req, res);

      const client = await oidc.Client.find(params.client_id);

      switch (prompt.name) {
        case 'login':
          return res.render('login', {
            accounts: users.accounts.map(formatAccount),
            mode: req.query.mode,
            client,
            uid,
            prompt,
            params,
            flash: undefined,
            email: params.login_hint,
          });
        case 'consent':
          return res.render('interaction', {
            client,
            uid,
            prompt,
            params,
            missingScopes: prompt.details?.missingOIDCScope?.filter(exclude(EXCLUDED_SCOPES)),
            missingClaims: prompt.details?.missingOIDCClaims?.filter(exclude(EXCLUDED_CLAIMS)),
            missingResourceScopes: prompt.details?.missingResourceScopes,
          });
        default:
          return next(new Error(`Unsupported prompt: ${prompt.name}`));
      }
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:uid/login', express.urlencoded({extended: false}), noCache, async (req, res, next) => {
    try {
      const {uid, params, prompt} = await oidc.interactionDetails(req, res);

      assert.equal(prompt.name, 'login');

      const client = await oidc.Client.find(params.client_id);

      const accountId = req.query.accountId || await users.authenticate(req.body.email, req.body.password);

      if (!accountId) {
        return res.render('login', {
          accounts: users.accounts.map(formatAccount),
          mode: req.query.mode,
          client,
          uid,
          prompt,
          params,
          flash: 'Invalid email or password.',
          email: req.body.email,
        });
      }

      const result = {
        login: {
          accountId,
        },
      };

      await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false });

      debug(`[${uid}] Successful log-in for ${accountId}`);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:uid/confirm', noCache, async (req, res, next) => {
    try {
      const interactionDetails = await oidc.interactionDetails(req, res);
      const {prompt: { name, details }, params, session: { accountId }, uid} = interactionDetails;

      assert.equal(name, 'consent');

      let grant;
      if (interactionDetails.grantId) {
        // we'll be modifying existing grant in existing session
        grant = await oidc.Grant.find(interactionDetails.grantId);
      } else {
        // we're establishing a new grant
        grant = new oidc.Grant({
          accountId,
          clientId: params.client_id,
        });
      }

      if (details.missingOIDCScope) {
        grant.addOIDCScope(details.missingOIDCScope.join(' '));
      }
      if (details.missingOIDCClaims) {
        grant.addOIDCClaims(details.missingOIDCClaims);
      }
      if (details.missingResourceScopes) {
        for (const [indicator, scopes] of Object.entries(details.missingResourceScopes)) {
          grant.addResourceScope(indicator, scopes.join(' '));
        }
      }

      const grantId = await grant.save();

      const result = {
        consent: {
          // Only include grant ID for newly created grant
          grantId: !interactionDetails.grantId ? grantId : undefined,
        }
      };

      await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: true });

      debug(`[${uid}] Consent confirmed`);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:uid/abort', noCache, async (req, res, next) => {
    try {
      const { uid } = await oidc.interactionDetails(req, res);

      const result = {
        error: 'access_denied',
        error_description: 'User aborted interaction',
      };
      await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false });

      debug(`[${uid}] Interaction aborted`);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export default interactions;
