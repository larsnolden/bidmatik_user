import moment from 'moment';
import * as R from 'ramda';
import { updateAccessToken } from 'bidmatikDep';
import renameKeys from '../../utils/renameKeys';
import advertisingApi from '../../advertisingApi/api';

const getSellerProfiles = async (db, userId) => {
  const sellerProfiles = await db.sellerProfile.find({ userId });
  return sellerProfiles.map(sellerProfile => ({
    ...sellerProfile,
    id: sellerProfile.profileId,
    name: sellerProfile.profileName,
    countryCode: sellerProfile.countryCode
  }));
};
const getSellerProfile = async (db, profileId) => {
  const sellerProfile = await db.sellerProfile.find({ profileId }).then(res => res[0]);
  console.log('get seller profile', sellerProfile.profileId);
  return {
    ...sellerProfile,
    id: sellerProfile.profileId,
    name: sellerProfile.profileName,
    countryCode: sellerProfile.countryCode
  };
};

const getCampaigns = async ({ db, user, profileId }) => {
  await updateAccessToken(user.userId, db);
  const { accessToken } = user;
  const campaigns = await advertisingApi.getCampaignsByProfile({
    profileId,
    accessToken
  });
  return campaigns
    ? R.map(
        renameKeys({
          campaignId: 'id',
          dailyBudget: 'budget'
        })
      )(campaigns)
    : [];
};

const getProfilePerformanceReduced = ({ knex, profileId, from, to }) =>
  knex.schema
    .raw(
      `
  select
    sum(sub.clicks) as clicks,
    sum(sub.impressions) as impressions,
    avg(sub.ctr) as ctr,
    sum(sub.spend) as spend,
    sum(sub.orders) as orders,
    sum(sub.revenue) as revenue,
    sum(sub.spend)/NULLIF(sum(sub.revenue),0) as acos
  from
  (
    select
      sum(clicks) as clicks,
      sum(impressions) as impressions,
      avg(clicks)/NULLIF(avg(impressions),0) as ctr,
      sum(cost) as spend,
      sum(attributed_units_ordered_1_d) as orders,
      sum(attributed_sales_1_d_same_sku) as revenue,
      date
    from "campaign_report" where "profile_id" = '${profileId}' and date::INT between ${moment(
        from
      ).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
    group by date
  ) as sub
`
    )
    .then(res => {
      console.log(res.rows[0]);
      return res.rows[0];
    });

const getProfilePerformanceAll = ({ knex, profileId, from, to }) =>
  knex.schema
    .raw(
      `
  select
    floor(max(clicks)) as clicks,
    floor(max(impressions)) as impressions,
    avg(impressions/NULLIF(attributed_sales_1_d_same_sku,0)) as ctr,
    floor(max(cost)) as spend,
    floor(max(attributed_units_ordered_1_d)) as orders,
    floor(max(attributed_sales_1_d_same_sku)) as revenue,
    avg(cost/NULLIF(attributed_sales_1_d_same_sku,0)) as acos,
    date
  from "campaign_report" where "profile_id" = '${profileId}' and date::INT between ${moment(
        from
      ).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
  group by date
  order by date
`
    )
    .then(res => res.rows);

const getActiveSellerProfile = async (db, profileId, userId) => {
  console.log('Lookup Active Seller Profile', profileId);
  const activeSellerProfile = await db.sellerProfile.find({ profileId }).then(res => res[0]);
  if (!activeSellerProfile) {
    //  no default activeProfileId set
    const firstSellerProfile = await db.sellerProfile.find({ userId }).then(res => res[0]);
    console.log('No Active Seller Profile Found, SET NEW', firstSellerProfile);
    await db.user.set({ userId, activeSellerProfileId: firstSellerProfile.profileId });
    return {
      ...firstSellerProfile,
      id: firstSellerProfile.profileId,
      name: firstSellerProfile.profileName,
      countryCode: firstSellerProfile.countryCode
    };
  }
  console.log('Active Seller Profile Found', activeSellerProfile.profileId);
  return {
    ...activeSellerProfile,
    id: activeSellerProfile.profileId,
    name: activeSellerProfile.profileName,
    countryCode: activeSellerProfile.countryCode
  };
};

const SetActiveSellerProfile = async (db, profileId, userId) => {
  await db.user.set({
    userId,
    activeSellerProfileId: profileId
  });
  console.log('set new seller profile', profileId);
  const sellerProfile = await getSellerProfile(db, profileId);
  return sellerProfile;
};

export default {
  Query: {
    SellerProfiles: async (_, __, { handler, user }) =>
      await getSellerProfiles(handler.db, user.id),
    //  return activeSellerProfile if no id specified
    SellerProfile: async (_, { id: profileId }, { handler, user }) =>
      profileId
        ? await getSellerProfile(handler.db, profileId)
        : await getActiveSellerProfile(handler.db, user.activeSellerProfileId, user.userId),
    ActiveSellerProfile: async (_, __, { handler, user }) =>
      await getActiveSellerProfile(handler.db, user.activeSellerProfileId, user.userId)
  },
  Mutation: {
    SetActiveSellerProfile: async (_, { id: profileId }, { handler, user }) =>
      await SetActiveSellerProfile(handler.db, profileId, user.userId)
  },
  SellerProfile: {
    Campaigns: (args, _, { handler, user }) => {
      console.log('args', args);
      console.log('user', user);
      const { id: profileId } = args;
      return getCampaigns({
        db: handler.db,
        user,
        profileId
      }),
    },
    ProfilePerformanceReduced: ({ id: profileId }, { from, to }, { handler, user }) =>
      getProfilePerformanceReduced({
        knex: handler.knex,
        profileId,
        from: from || user.filterDateFrom,
        to: to || user.filterDateTo
      }),
    ProfilePerformance: ({ id: profileId }, { from, to }, { handler, user }) =>
      getProfilePerformanceAll({
        knex: handler.knex,
        profileId,
        from: from || user.filterDateFrom,
        to: to || user.filterDateTo
      })
  }
};
