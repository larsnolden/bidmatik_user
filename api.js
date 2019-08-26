import fs from 'fs';
import { merge } from 'lodash';
import gqlLoader from './utils/gqlLoader';

const AuthSchema = gqlLoader('./authenticate/authenticateSchema.graphql');
import { AuthResolver } from './authenticate/authenticate';
  
import SellerProfileResolver from './server/sellerProfile/sellerProfileResolver';
const SellerProfileSchema = gqlLoader('./server/sellerProfile/sellerProfileSchema.graphql');

import CampaignResolver from './server/campaign/campaignResolver';
const CampaignSchema = gqlLoader('./server/campaign/campaignSchema.graphql');

import DateResolver from './server/customScalar/dateResolver';
const DateSchema = gqlLoader('./server/customScalar/dateSchema.graphql');

import UserFilterDatesResolver from './server/UserFilterDates/UserFilterDatesResolver';
import sellerProfileResolver from './server/sellerProfile/sellerProfileResolver';
const UserFilterDatesSchema = gqlLoader('./server/UserFilterDates/UserFilterDatesSchema.graphql');

//  Root Schema, all others extend this
const RootSchema = `
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
`;

export const typeDefs = [RootSchema, AuthSchema, DateSchema, CampaignSchema, SellerProfileSchema, UserFilterDatesSchema].join(' ');
fs.writeFile('./schema.txt', typeDefs);
export const resolvers = merge([AuthResolver, DateResolver, CampaignResolver, UserFilterDatesResolver, SellerProfileResolver]);