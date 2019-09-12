import moment from 'moment';
import * as R from 'ramda';
import createComparisonTimePeriods from '../../utils/createComparisonTimePeriods';
import createPerformanceDelta from '../../utils/createPerformanceDelta';

const getAdGroup = ({ knex, adGroupId }) =>
  knex
    .raw(
      `
  Select
    ad_group_id as id,
    ad_group_name as name
  from ad_group_report
    where ad_group_id = '${adGroupId}'
  order by date desc
  limit 1
`
    )
    .then(res => res.rows[0]);

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

const getKeywords = async ({ knex, adGroupId, from, to }) => {
  const res = await knex.raw(`
    select
      distinct on (id)
      keyword_id as id,
      keyword_text as term,
      match_type as "matchType",
      bid
    from active_keyword
      where ad_group_id = '${adGroupId}' 
      and date::INT between ${moment(from).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
      and bid is not null
    order by id, date desc;
  `);
  console.log('res for getKeywords', res.rows);
  return res.rows;
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

export default {
  Query: {
    AdGroup: (parent, { id: adGroupId }, { handler }) =>
      getAdGroup({
        knex: handler.knex,
        adGroupId
      })
  },
  AdGroup: {
    AdGroupPerformanceDelta: async ({ id: adGroupId }, { from, to }, { handler, user }) => {
      const dates = createComparisonTimePeriods(
        from || user.filterDateFrom,
        to || user.filterDateTo
      );
      console.log(dates);
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
    Keywords: ({ id: adGroupId }, { from, to }, { handler, user }) =>
      getKeywords({
        knex: handler.knex,
        adGroupId,
        from: from || user.filterDateFrom,
        to: to || user.filterDateTo
      })
  }
};
