require('dotenv').config();
import { GraphQLServer } from 'graphql-yoga';
import db, { knex } from './db';
import { authenticateSession } from './authenticate/authenticate';
import {
  typeDefs,
  resolvers
} from './api';

const isProduction = process.env.NODE_ENV === 'production';

// TODO: enrich context with db and knex => handler.db, handler.knex 

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: async ({ request }) => {
    const user = isProduction
      ? await authenticateSession(request)
      : await db.user.find({ userId: process.env.DEVELOPMENT_USER_ID }).then(res => res[0]);
    return {
      user,
      handler: {
        db,
        knex
      },
    }
  }
});
server.start({
  playground: '/playground'
}, () => console.log(`Server is listening on ${4000}`))