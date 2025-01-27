import fs from 'fs';
import { merge } from 'lodash';
import gqlLoader from './utils/gqlLoader';

const AuthSchema = gqlLoader('./authenticate/authenticateSchema.graphql');
import { AuthResolver } from './authenticate/authenticate';

const PerformanceSchema = gqlLoader('./server/performanceSchema.graphql');

import SellerProfileResolver from './server/sellerProfile/sellerProfileResolver';
const SellerProfileSchema = gqlLoader('./server/sellerProfile/sellerProfileSchema.graphql');

import CampaignResolver from './server/campaign/campaignResolver';
const CampaignSchema = gqlLoader('./server/campaign/campaignSchema.graphql');

import DateResolver from './server/customScalar/dateResolver';
const DateSchema = gqlLoader('./server/customScalar/dateSchema.graphql');

import UserFilterDatesResolver from './server/UserFilterDates/UserFilterDatesResolver';
const UserFilterDatesSchema = gqlLoader('./server/UserFilterDates/UserFilterDatesSchema.graphql');

import AdGroupResolver from './server/adGroup/adGroupResolver';
const AdGroupSchema = gqlLoader('./server/adGroup/adGroupSchema.graphql');

import KeywordResolver from './server/keyword/keywordResolver';
const KeywordSchema = gqlLoader('./server/keyword/keywordSchema.graphql');

//  Root Schema, all others extend this
const RootSchema = `
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
`;

export const typeDefs = [
  RootSchema,
  AuthSchema,
  DateSchema,
  PerformanceSchema,
  CampaignSchema,
  SellerProfileSchema,
  UserFilterDatesSchema,
  KeywordSchema,
  AdGroupSchema
].join(' ');
export const resolvers = merge([
  AuthResolver,
  DateResolver,
  CampaignResolver,
  UserFilterDatesResolver,
  SellerProfileResolver,
  AdGroupResolver,
  KeywordResolver
]);
