import { dbBuilder } from 'bidmatikDep';
import knexBuilder from 'knex';
import pg from 'pg';

pg.types.setTypeParser(1700, 'text', parseFloat);

const isProduction = process.env.NODE_ENV === 'production';
console.log('IS PRODUCION: ', isProduction);

const productionConnection = {
  host: process.env.DB_IP_PRODUCTION,
  user: process.env.DB_USER_PRODUCTION,
  password: process.env.DB_PASS_PRODUCTION,
  database: 'bidmatik'
};

const developmentConnection = {
  host: process.env.DB_IP_DEVELOPMENT,
  user: process.env.DB_USER_DEVELOPMENT,
  password: process.env.DB_PASS_DEVELOPMENT,
  database: 'bidmatik'
};

const developmentCloudConnection = {
  host: process.env.DB_IP_CLOUD_DEVELOPMENT,
  user: process.env.DB_USER_PRODUCTION,
  password: process.env.DB_PASS_PRODUCTION,
  database: 'bidmatik'
};

const connection = isProduction ? productionConnection : developmentCloudConnection;
console.log('using connection', connection);

export const knex = knexBuilder({
  // debug: true,
  client: 'pg',
  version: '9.6',
  connection
});

export default dbBuilder(knex);
