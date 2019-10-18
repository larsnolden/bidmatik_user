require('dotenv').config();
import moment from 'moment';
import { GraphQLServer } from 'graphql-yoga';
import db, { knex } from './db';
import { authenticateSession } from './authenticate/authenticate';
import { typeDefs, resolvers } from './api';
import traceKnex from './utils/traceKnex';

const isProduction = process.env.NODE_ENV === 'production';
console.log('ENV: ', process.env);

knex = traceKnex(knex);

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: async ({ request, response }) => {
    const user = isProduction
      ? await authenticateSession(request)
      : await db.user.find({ userId: process.env.DEVELOPMENT_USER_ID }).then(res => res[0]);

    //  parse filter dates
    if (user) {
      user.filterDateFrom = moment(user.filterDateFrom);
      user.filterDateTo = moment(user.filterDateTo);
    }

    if (isProduction) response.set('Access-Control-Allow-Origin', 'https://app.bidmatik.com');

    return {
      user,
      handler: {
        db,
        knex
      }
    };
  }
});
server.start(
  {
    tracing: true,
    playground: '/playground'
  },
  () => console.log(`Server is listening on ${4000}`)
);
