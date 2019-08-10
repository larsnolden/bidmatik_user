import gql from 'graphql-tag';
import { GraphQLScalarType } from 'graphql';
import casual from 'casual';

export const typeDef = gql`
  scalar Date
  extend type Query {
    campaigns(from: Date, to: Date): [Campaign]
  }
  type Campaign {
    name: String
    type: AdType
    targeting: Targeting
    budget: Float
    impressions: Int
    clicks: Int
    ctr: Float
    spend: Float
    cpc: Float
    orders: Int
    sales: Float
    aocs: Float
    portfolio: String
  }
  enum Targeting {
    Automatic
    Manual
  }
  enum AdType {
    SP
    SB
  }
`;

export const resolvers = {
  Query: {
    campaigns(_, { from, to }) {
      //  resolve a list of campaigns
      return [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
    },
  },
  Campaign: { 
    name: () => casual.catch_phrase + ' campaign',
    type: () => Math.random() >= 0.5 ? 'SP' : 'SB',
    targeting: () => Math.random() >= 0.5 ? 'Manual' : 'Automatic',
    budget: () => casual.integer(10, 25),
    impressions: () => casual.integer(1000, 10000),
    clicks: () => casual.integer(300, 1000),
    ctr: () => casual.double(0.01, 0.6),
    spend: () => casual.integer(50, 500),
    cpc: () => casual.double(0.1, 2.5),
    orders: () => casual.integer(100, 300),
    sales: () => casual.integer(100, 10000),
    aocs: () =>casual.double(0.05, 0.021),
    portfolio: () => 'Demo Portfolio'
  },
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return new Date(value); // value from the client
    },
    serialize(value) {
      return value.getTime(); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value) // ast value is always in string format
      }
      return null;
    },
  }),
};



