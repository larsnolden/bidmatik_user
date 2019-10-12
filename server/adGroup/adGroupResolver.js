import moment from 'moment';
import * as R from 'ramda';
import { updateAccessToken } from 'bidmatikDep';
import createComparisonTimePeriods from '../../utils/createComparisonTimePeriods';
import createPerformanceDelta from '../../utils/createPerformanceDelta';
import renameKeys from '../../utils/renameKeys';

import advertisingApi from '../../advertisingApi/api';

import { getKeywordPerformanceReduced } from '../keyword/keywordResolver';

const getAdGroup = async ({ user, adGroupId, db }) => {
  await updateAccessToken(user.userId, db);
  const { accessToken, activeSellerProfileId: profileId } = user;
  const adGroup = await advertisingApi.getAdgroupById({
    adGroupId,
    profileId,
    accessToken
  });
  console.log('got ad group', adGroup);
  return renameKeys({
    adGroupId: 'id'
  })(adGroup);
};

const adGroupPerformanceReduced = ({ knex, adGroupId, from, to }) =>
  knex
    .raw(
      `
        select
          sum(sub.clicks) as clicks,
          sum(sub.impressions) as impressions,
          avg(sub.ctr) as ctr,
          sum(sub.spend) as spend,
          sum(sub.orders) as orders,
          sum(sub.revenue) as revenue,
          sum(sub.spend)/NULLIF(sum(revenue),0) as acos
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
          from "ad_group_report" where "ad_group_id" = '${adGroupId}' and date::INT between ${moment(
        from
      ).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
          group by date
        ) as sub
      `
    )
    .then(res => res.rows[0]);

const getAdGroupPerformanceDelta = async ({ knex, adGroupId, dates }) => {
  const getPerformance = ({ from, to }) =>
    adGroupPerformanceReduced({
      knex,
      adGroupId,
      from,
      to
    });
  return createPerformanceDelta({ knex, getPerformance, dates });
};

const getKeywords = async ({ knex, db, adGroupId, user, from, to }) => {
  await updateAccessToken(user.userId, db);
  const { accessToken, activeSellerProfileId: profileId } = user;
  const keywords = await advertisingApi.getKeywordsByAdGroup({
    adGroupId,
    profileId,
    accessToken
  });

  // return [];

  const keywordsWithPerformance = keywords.map(async keyword => {
    const { keywordId } = keyword;
    const KeywordPerformanceReduced = await getKeywordPerformanceReduced({
      knex,
      keywordId,
      from,
      to
    });
    return {
      KeywordPerformanceReduced,
      ...keyword,
      id: keywordId,
      term: keyword.keywordText
    };
  });

  return Promise.all(keywordsWithPerformance);
  console.log(keywordsWithPerformance[0]);
  return R.map(
    renameKeys({
      keywordId: 'id',
      keywordText: 'term'
    })
  )(keywordsWithPerformance);
};

const getAdGroupPerformance = ({ knex, adGroupId, from, to }) =>
  knex
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
    from "ad_group_report"
      where "ad_group_id" = '${adGroupId}' and date::INT between ${moment(from).format(
        'YYYYMMDD'
      )} and ${moment(to).format('YYYYMMDD')}
    group by date
    order by date
`
    )
    .then(res => res.rows);

const setAdGroupSettings = async ({ input, user, db }) => {
  const { id, dailyBudget, updateBids, targetAcos, addKeywords, addNegativeKeywords } = input;
  //  TODO: call amazon api for updating daily budget, write resolver for daily budget below
  console.log('input', input);
  await db.adGroup.set({
    adGroupId: id,
    userId: user.userId,
    profileId: user.activeSellerProfileId,
    dailyBudget,
    updateBids,
    targetAcos,
    addKeywords,
    addNegativeKeywords
  });
  const adGroup = await db.adGroup.find({ adGroupId: id });
  return adGroup;
};

const getAdGroupSettings = async ({ adGroupId, user, db }) => {
  const settings = await db.adGroup.find({ adGroupId }).then(res => res[0]);
  console.log('settings', settings);
  if (!settings || R.isEmpty(Object.keys(settings))) {
    // no settings exist, create in db
    console.log('creating new settings');
    const adGroupSettingsDefault = {
      id: adGroupId,
      updateBids: false,
      targetAcos: 0.2,
      addKeywords: false,
      addNegativeKeywords: false
    };
    await setAdGroupSettings({ input: adGroupSettingsDefault, user, db });
    return adGroupSettingsDefault;
  }
  console.log('found these settings:', settings);
  return settings;
};

export default {
  Query: {
    AdGroup: (parent, { id: adGroupId }, { user, handler }) =>
      getAdGroup({
        db: handler.db,
        user,
        adGroupId
      })
  },
  Mutation: {
    setAdGroupSettings: (_, { input }, { handler, user }) => {
      return setAdGroupSettings({ db: handler.db, user, input });
    }
  },
  AdGroup: {
    adGroupSettings: ({ id: adGroupId }, _, { handler, user }) =>
      getAdGroupSettings({ adGroupId, user, db: handler.db }),
    AdGroupPerformanceDelta: async ({ id: adGroupId }, { from, to }, { handler, user }) => {
      const dates = createComparisonTimePeriods(
        from || user.filterDateFrom,
        to || user.filterDateTo
      );
      return getAdGroupPerformanceDelta({
        knex: handler.knex,
        adGroupId,
        dates
      });
    },
    AdGroupPerformanceReduced: ({ id: adGroupId }, { from, to }, { handler, user }) =>
      adGroupPerformanceReduced({
        knex: handler.knex,
        adGroupId,
        from: from || user.filterDateFrom,
        to: to || user.filterDateTo
      }),
    AdGroupPerformance: ({ id: adGroupId }, { from, to }, { handler, user }) =>
      getAdGroupPerformance({
        knex: handler.knex,
        adGroupId,
        from: from || user.filterDateFrom,
        to: to || user.filterDateTo
      }),
    Keywords: ({ id: adGroupId }, { from, to }, { handler, user }, query) =>
      getKeywords({
        knex: handler.knex,
        db: handler.db,
        user,
        adGroupId,
        from: user.filterDateFrom || query.operation.variableValues.from,
        to: user.filterDateTo || query.operation.variableValues.to
      })
  },
  adGroupSettings: {
    // todo: replace with api call, and remove col from db => much easier to have one source of thruth
    dailyBudget: () => 22
  }
};
