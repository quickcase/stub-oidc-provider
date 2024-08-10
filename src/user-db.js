const debug = require('debug')('stub-oidc-provider:users');
const {validate} = require('jsonschema');
const loadFile = require('./file-loader');

const SCHEMA = {
  type: 'array',
  items: {
    properties: {
      id: {type: 'string'},
      email: {type: 'string'},
      password: {type: 'string'},
      claims: {
        type: 'object',
        additionalProperties: {
          type: 'string',
        },
      },
    },
    additionalProperties: false,
    required: ['id', 'email'],
  },
  minItems: 1,
};

const loadUsers = (path) => {
  const users = loadFile(path);

  const {valid, errors} = validate(users, SCHEMA);

  if (!valid) {
    throw errors;
  }

  debug(`Succesfully loaded ${users.length} users from user file`);

  return users;
};

const claims = (user) => async () => Object.assign({}, user.claims, {
  sub: user.id,
  email: user.email,
});

const database = (users) => ({
  accounts: users,
  findAccount: async (ctx, sub) => users.filter(user => user.id === sub)
                                        .map(user => ({
                                          accountId: user.id,
                                          claims: claims(user),
                                        }))[0],
  authenticate: async (email, password) => users.filter(user => email.localeCompare(user.email, {sensitivity: 'base'}) === 0)
                                                .filter(user => !user.password || user.password === password)
                                                .map(user => user.id)[0],
});

const fromPath = (path) => database(loadUsers(path));

const UserDB = {
  database,
  fromPath,
}

module.exports = UserDB;
