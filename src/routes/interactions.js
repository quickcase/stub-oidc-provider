const debug = require('debug')('stub-oidc-provider:interactions');
const express = require('express');

const noCache = (req, res, next) => {
  res.set('Pragma', 'no-cache');
  res.set('Cache-Control', 'no-cache, no-store');
  return next();
};

const interactions = (users, oidc) => {
  const router = express.Router();

  router.get('/:uid', noCache, async (req, res, next) => {
    try {
      const {uid, params, prompt} = await oidc.interactionDetails(req, res);

      const client = await oidc.Client.find(params.client_id);

      if (prompt.name === 'login') {
        return res.render('login', {
          client,
          uid,
          prompt,
          params,
          flash: undefined,
          email: params.login_hint,
        });
      }
      return res.render('interaction', {
        client,
        uid,
        prompt,
        params,
        scopes: prompt.details.scopes,
        claims: prompt.details.claims,
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:uid/login', express.urlencoded({ extended: false }), noCache, async (req, res, next) => {
    try {
      const { uid, params, prompt } = await oidc.interactionDetails(req, res);

      const client = await oidc.Client.find(params.client_id);

      const accountId = await users.authenticate(req.body.email, req.body.password);

      if (!accountId) {
        return res.render('login', {
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
          account: accountId,
        },
      };

      await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false });

      debug(`[${uid}] Succesful log-in for ${accountId}`);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:uid/confirm', noCache, async (req, res, next) => {
    try {
      const { uid } = await oidc.interactionDetails(req, res);

      const result = {
        consent: {},
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

module.exports = interactions;
