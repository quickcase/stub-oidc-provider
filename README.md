# stub-oidc-provider

A stubbed OIDC provider, based on [panva/node-oidc-provider](https://github.com/panva/node-oidc-provider).

## Getting started

While other uses are not prevented, the primary use case for this project is to be used as part of a Docker Compose stack.

This can be achieved by including it as a service like so:
```yml
---
version: '3'

services:
  oidc:
    image: ghcr.io/quickcase/stub-oidc-provider:latest
    environment:
      PORT: 9000
      CONFIG_FILE: /oidc/config.yml
      ISSUER: http://localhost:9000
      USERS_FILE: /oidc/users.yml
      DEBUG: 'stub-oidc-provider:*,oidc-provider:*'
    volumes:
      - ./oidc:/oidc
    ports:
      - '9000:9000'
```

Configuration is achieved via 2 files, config and users, provided via a folder (here `oidc/`) mounted as a volume.

Consent prompt on login is disabled by default. To enable it, set environment variable `PROMPT_CONSENT: true`.

### Config

The provider configuration can be provided either as a JSON or YAML file, in the form of an array.
The path to the file is specified via the environment variable `CONFIG_FILE`.

The configuration exactly follows options specified by [node-oidc-provider](https://github.com/panva/node-oidc-provider/blob/v6.x/docs/README.md#configuration-options), with the exception of `findAccount` which cannot be overridden.

By default are configured:
- `jwks`: A default JWKS
- 3 claims `sub`, `email` and `email_verified`; mapped to respective scopes `openid` and `email`
- `cookie.keys`: A default signing key for cookies

Here is an example configuration extending the defaults above:

```yml
clients:
  - client_id: test
    client_secret: secret
    client_name: Test client
    redirect_uris:
      - http://localhost:8080/oauth2
    scope: openid email profile

claims:
  openid:
    - sub
  profile:
    - name
  email:
    - email

conformIdTokenClaims: false

formats:
  AccessToken: jwt

ttl:
  AccessToken: 300
  AuthorizationCode: 300
  ClientCredentials: 60
  IdToken: 300
  RefreshToken: 3600
```

#### extraAccessTokenClaims

Additional claims can be read from a user's claims and added to the access token by listing the claims' names under property `extraAccessTokenClaims`:

```yml
extraAccessTokenClaims:
  - extraClaim1
  - extraClaim2
```

The claim value will be as set in the user or an empty string if not set in the user.

### Users

Users can be provided either as a JSON or YAML file, in the form of an array.
The path to the file is specified via the environment variable `USERS_FILE`.

As a minimum, each user must be provided with an `id` and an `email`. The email is used as the identifier for authenticating the user.
The `id` will be used as a `sub` claim, the `email` as the `email` one.

An optional `password` can be provided, however when no password is provided any password, including a blank one, will be considered valid when authenticating the user.

Finally, additional claims can be provided as key/value pairs under the `claims` property: 

```yml
- id: user-001 # Required
  email: test@example.com # Required
  claims:
    name: Test User
    email_verified: true
    private/custom_claim: Value
- id: user-002 # Required
  email: test-2@example.com # Required
```

### Issuer

The URI to use as the issuer for OAuth2 and OpenID Connect tokens.
