import moment from 'moment';
import DataLoader from 'dataloader';
import * as R from 'ramda';

import createComparisonTimePeriods from '../../utils/createComparisonTimePeriods';
import createPerformanceDelta from '../../utils/createPerformanceDelta';

const getKeyword = ({ knex, keywordId }) =>
  knex
    .raw(
      `
      select
        report.keyword_id as id,
        report.keyword_text as term,
        active.bid as bid
      from keyword_report report
      join active_keyword active on report.keyword_id = active.keyword_id  
        where report.keyword_id = '${keywordId}'
      order by active.date desc
      limit 1;
    `
    )
    .then(res => res.rows[0]);

const getKeywordLatestBid = ({ knex, keywordId }) =>
  knex
    .raw(
      `
  select
    bid as bid
  from active_keyword
    where keyword_id = '${keywordId}'
  order by date desc
  limit 1;
`
    )
    .then(res => res.rows[0].bid);

const getKeywordTerm = ({ knex, keywordId }) =>
  knex
    .raw(
      `
  select
    keyword_text as term
  from active_keyword
    where keyword_id = '${keywordId}'
  limit 1;
`
    )
    .then(res => res.rows[0].term);

const getKeywordMatchType = ({ knex, keywordId }) =>
  knex
    .raw(
      `
  select
    match_type as "matchType"
  from active_keyword
    where keyword_id = '${keywordId}'
  limit 1;
`
    )
    .then(res => res.rows[0].matchType);

// export const getKeywordPerformanceReduced = ({ knex, keywordId, from, to }) =>
//   knex
//     .raw(
//       `
//           select
//           sum(sub.clicks) as clicks,
//           sum(sub.impressions) as impressions,
//           avg(sub.ctr) as ctr,
//           sum(sub.spend) as spend,
//           sum(sub.orders) as orders,
//           sum(sub.revenue) as revenue,
//           sum(sub.spend)/NULLIF(sum(revenue),0) as acos
//           from
//           (
//             select
//               sum(clicks) as clicks,
//               sum(impressions) as impressions,
//               avg(clicks)/NULLIF(avg(impressions),0) as ctr,
//               sum(cost) as spend,
//               sum(attributed_units_ordered_1_d) as orders,
//               sum(attributed_sales_1_d_same_sku) as revenue,
//               date
//             from "keyword_report" where "keyword_id" = '${keywordId}' and date::INT between ${moment(
//         from
//       ).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
//             group by date
//           ) as sub
//       `
//     )
//     .then(res => res.rows[0]);

const getKeywordPerformnaceReducedBatched = ({ knex, keywordIds, from, to }) =>
  knex
    .raw(
      `
      select
        max(sub.keyword_id) as keyword_id,
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
              max(keyword_id) as keyword_id,
              sum(clicks) as clicks,
              sum(impressions) as impressions,
              avg(clicks)/NULLIF(avg(impressions),0) as ctr,
              sum(cost) as spend,
              sum(attributed_units_ordered_1_d) as orders,
              sum(attributed_sales_1_d_same_sku) as revenue,
              date
            from "keyword_report" where keyword_id in (${keywordIds.map(
              id => `'${id}'`
            )}) and date::INT between ${moment(from).format('YYYYMMDD')} and ${moment(to).format(
        'YYYYMMDD'
      )}
            group by date, keyword_id
          ) as sub group by keyword_id
    `
    )
    .then(res => res.rows);

//  from and to date are for every request the same, but we want to batch the keywordIds
const reducePerformanceReducedRequests = R.reduce(
  (batchedRequests, request) => ({
    ...request,
    keywordIds: [...(batchedRequests.keywordIds || []), request.keywordId]
  }),
  {}
);

const keywordPerformanceReducedDataLoader = new DataLoader(
  R.pipe(
    reducePerformanceReducedRequests,
    getKeywordPerformnaceReducedBatched
  )
);

export const getKeywordPerformanceReduced = ({ knex, keywordId, from, to }) => {
  return keywordPerformanceReducedDataLoader.load({ knex, keywordId, from, to });
};

const getKeywordPerformanceDelta = ({ knex, keywordId, dates }) => {
  const getPerformance = ({ from, to }) =>
    getKeywordPerformanceReduced({
      knex,
      keywordId,
      from,
      to
    });
  return createPerformanceDelta({ knex, getPerformance, dates });
};

const getIsKeywordAutomated = ({ knex, keywordId }) => {
  return knex('keyword')
    .where({ keywordId })
    .select('automated');
};

export default {
  Query: {
    Keyword: (parent, { id: keywordId }, { handler }) =>
      getKeyword({
        knex: handler.knex,
        keywordId
      })
  },
  Keyword: {
    term: ({ id: keywordId, term }, args, { handler }) =>
      term ||
      getKeywordTerm({
        knex: handler.knex,
        keywordId
      }),
    //  current bid
    bid: ({ id: keywordId, bid }, args, { handler }) =>
      bid ||
      getKeywordLatestBid({
        knex: handler.knex,
        keywordId
      }),
    matchType: ({ id: keywordId, matchType }, args, { handler }) =>
      matchType ||
      getKeywordMatchType({
        knex: handler.knex,
        keywordId
      }),
    automated: ({ id: keywordId }, args, { handler }) =>
      // TODO: remove placeholder, add paging with sort
      // true,
      getIsKeywordAutomated({
        knex: handler.knex,
        keywordId
      }),
    KeywordPerformanceReduced: ({ id: keywordId }, { from, to }, { handler, user }) =>
      // TODO: remove placeholder, add paging with sort
      // ({
      //   absoluteAcos: null,
      //   absoluteRevenue: null,
      //   acos: null,
      //   clicks: 0,
      //   date: '20190606',
      //   impressions: 0,
      //   revenue: 0,
      //   spend: 0
      // }),
      getKeywordPerformanceReduced({
        knex: handler.knex,
        keywordId,
        from: from || user.filterDateFrom,
        to: to || user.filterDateTo
      }),
    KeywordPerformanceDelta: ({ id: keywordId }, { from, to }, { handler, user }) => {
      // TODO: remove placeholder, add paging with sort
      return {
        absoluteAcos: null,
        absoluteRevenue: null,
        acos: null,
        clicks: 0,
        date: '20190606',
        impressions: 0,
        revenue: 0,
        spend: 0
      };
      const dates = createComparisonTimePeriods(
        from || user.filterDateFrom,
        to || user.filterDateTo
      );
      return getKeywordPerformanceDelta({
        knex: handler.knex,
        keywordId,
        dates
      });
    }
  }
};
