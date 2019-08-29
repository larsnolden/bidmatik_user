import { keysToSnakeCase, listToCamelCase } from 'bidmatikDep/helper';
import moment from 'moment';

const getSellerProfiles = async (db, userId) => {
  const sellerProfiles = await db.sellerProfile.find({ userId });
  return sellerProfiles.map(sellerProfile => ({
    ...sellerProfile,
    id: sellerProfile.profileId,
  }))
};
const getSellerProfile = async (db, profileId) => {
  const sellerProfile = await db.sellerProfile.find({ profileId }).then(res => res[0]);
  return {
    ...sellerProfile,
    id: sellerProfile.profileId,
  }
};

const getCampaigns = ({ knex, profileId, from, to }) => knex.raw(`
  select
    max(campaign_name) as name,
    max(campaign_id) as id,
    max(campaign_budget) as budget
  from "campaign_report" where "profile_id" = '${profileId}' and date::INT between ${moment(from).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
  group by campaign_id
`).then(res => res.rows);

const getProfilePerformanceReduced = ({ knex, profileId, from, to }) => knex.schema.raw(`
  select
    sum(sub.clicks) as clicks,
    sum(sub.impressions) as impressions,
    avg(sub.ctr) as ctr,
    sum(sub.spend) as spend,
    sum(sub.orders) as orders,
    sum(sub.revenue) as revenue,
    avg(sub.acos) as acos
  from
  (
    select
      max(clicks) as clicks,
      max(impressions) as impressions,
      avg(clicks)/NULLIF(avg(impressions),0) as ctr,
      max(cost) as spend,
      max(attributed_units_ordered_1_d) as orders,
      max(attributed_sales_1_d_same_sku) as revenue,
      avg(cost/NULLIF(attributed_sales_1_d_same_sku,0)) as acos,
      date
    from "campaign_report" where "profile_id" = '${profileId}' and date::INT between ${moment(from).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
    group by date
  ) as sub
`).then(res => res.rows[0]);

const getProfilePerformanceAll = ({ knex, profileId, from, to }) => knex.schema.raw(`
  select
    floor(max(clicks)) as clicks,
    floor(max(impressions)) as impressions,
    avg(impressions/NULLIF(attributed_sales_1_d_same_sku,0)) as ctr,
    floor(max(cost)) as spend,
    floor(max(attributed_units_ordered_1_d)) as orders,
    floor(max(attributed_sales_1_d_same_sku)) as revenue,
    avg(cost/NULLIF(attributed_sales_1_d_same_sku,0)) as acos,
    date
  from "campaign_report" where "profile_id" = '${profileId}' and date::INT between ${moment(from).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
  group by date
  order by date
`).then(res => res.rows);

export default {
  Query: {
    SellerProfiles: async (_, __, { handler, user }) => await getSellerProfiles(handler.db, user.id),
    SellerProfile: async (_, { id: profileId }, { handler }) => await getSellerProfile(handler.db, profileId),
  },
  SellerProfile: {
    Campaigns: async ({ id: profileId }, { from, to }, { handler, user }) => await getCampaigns({ knex: handler.knex, profileId, from: from || user.filterDateFrom, to: to || user.filterDateTo }),
    ProfilePerformanceReduced: async ({ id: profileId }, { from, to }, { handler, user }) => await getProfilePerformanceReduced({ knex: handler.knex, profileId, from: from || user.filterDateFrom, to: to || user.filterDateTo }),
    ProfilePerformance: async ({ id: profileId }, { from, to }, { handler, user }) => await getProfilePerformanceAll({ knex: handler.knex, profileId, from: from || user.filterDateFrom, to: to || user.filterDateTo })
  }
}