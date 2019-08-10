import { GraphQLServer } from 'graphql-yoga';
import { mergeAll } from 'ramda';

import {
  typeDef as Mock,
  resolvers as mockResolvers
} from './mock';

//  main Schema, all others extend this
const Schema = `
  type Query {
    _empty: String
  }
`;


const typeDefs = [Schema, Mock];
const resolvers = mergeAll(mockResolvers);


const server = new GraphQLServer({ typeDefs, resolvers });
server.start({
  playground: '/playground'
}, () => console.log(`Server is listening on ${4000}`))