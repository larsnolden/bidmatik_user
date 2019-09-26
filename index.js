require('dotenv').config();
import moment from 'moment';
import { GraphQLServer } from 'graphql-yoga';
import db, { knex as knexOriginal } from './db';
import { authenticateSession } from './authenticate/authenticate';
import { typeDefs, resolvers } from './api';
import traceKnex from './utils/traceKnex';

const isProduction = process.env.NODE_ENV === 'production';

const knex = traceKnex(knexOriginal);

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: async ({ request }) => {
    const user = isProduction
      ? await authenticateSession(request)
      : await db.user.find({ userId: process.env.DEVELOPMENT_USER_ID }).then(res => res[0]);
    user.filterDateFrom = moment(user.filterDateFrom);
    user.filterDateTo = moment(user.filterDateTo);

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
