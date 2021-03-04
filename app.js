const express = require('express');
const logger = require('morgan');
const path = require('path');

const loadConfig = require('./src/config');
const Oidc = require('./src/oidc');
const UserDB = require('./src/user-db');

const interactions = require('./src/routes/interactions');

const app = express();

const config = loadConfig();
const users = UserDB.fromPath(config.USERS_FILE);
const oidc = Oidc.fromPath(config.CONFIG_FILE)(config.ISSUER, users.findAccount);

// view engine setup
app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/interaction', interactions(users, oidc));
app.use(oidc.callback);

module.exports = app;
