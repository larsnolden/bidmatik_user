import gql from 'graphql-tag';
import { GraphQLScalarType } from 'graphql';
import casual from 'casual';
import moment from 'moment';

export const typeDef = gql`
  scalar Date
  extend type Query {
    campaigns(from: Date, to: Date): [Campaign]
    accountPerformance(from: Date, to: Date): [AccountPerformance]
  }
  type Campaign {
    id: ID!
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
    revenue: Float
    acos: Float
    portfolio: String
  }
  type AccountPerformance {
    budget: Float
    impressions: Int
    clicks: Int
    ctr: Float
    spend: Float
    cpc: Float
    orders: Int
    revenue: Float
    acos: Float
    absoluteRevenue: Int
    absoluteAcos: Float
    date: Date
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

let monthCount = 1;

export const resolvers = {
  Query: {
    campaigns(_, { from, to }) {
      //  resolve a list of campaigns
      console.log('query campaigns:', from, to)
      return [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
    },
    accountPerformance(_, { from, to }) {
      return [{}, {}, {}, {}, {}, {}]
    }
  },
  Campaign: { 
    id: () => casual.uuid,
    name: () => casual.catch_phrase + ' campaign',
    type: () => Math.random() >= 0.5 ? 'SP' : 'SB',
    targeting: () => Math.random() >= 0.5 ? 'Manual' : 'Automatic',
    budget: () => casual.integer(10, 25),
    impressions: () => casual.integer(1000, 10000),
    clicks: () => casual.integer(300, 1000),
    ctr: () => casual.double(1, 20),
    spend: () => casual.integer(50, 500),
    cpc: () => casual.double(1, 20),
    orders: () => casual.integer(100, 300),
    revenue: () => casual.integer(100, 10000),
    acos: () =>casual.double(1, 20),
    portfolio: () => 'Demo Portfolio'
  },
  AccountPerformance: {
    budget: () => casual.integer(10, 25),
    impressions: () => casual.integer(1000, 10000),
    clicks: () => casual.integer(300, 1000),
    ctr: () => casual.double(1, 20),
    spend: () => casual.integer(50, 500),
    cpc: () => casual.double(1, 20),
    orders: () => casual.integer(100, 300),
    revenue: () => casual.integer(100, 10000),
    acos: () => casual.double(1, 20),
    absoluteRevenue: () => casual.integer(10000, 100000),
    absoluteAcos: () => casual.double(1, 20),
    date: () => moment(moment.now()).subtract(monthCount++, 'months').valueOf(),
  },
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return moment(value); // value from the client
    },
    serialize(value) {
      return moment(value).valueOf(); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value) // ast value is always in string format
      }
      return null;
    },
  }),
};



