import express from 'express';
import logger from 'morgan';
import path from 'path';

import loadConfig from './src/config.js';
import Oidc from './src/oidc.js';
import interactions from './src/routes/interactions.js';
import UserDB from './src/user-db.js';

const __dirname = import.meta.dirname;

const app = express();

const config = loadConfig();
const users = UserDB.fromPath(config.USERS_FILE);
const oidc = Oidc.fromPath(config.CONFIG_FILE)(config.ISSUER, users.findAccount);

// view engine setup
app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/interaction', interactions(users, oidc));
app.use(oidc.callback());

export default app;
