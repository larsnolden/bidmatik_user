import moment from 'moment';
import * as R from 'ramda';

const getAdGroup = ({ knex, adGroupId }) => knex.raw(`
  Select
    ad_group_id as id,
    ad_group_name as name
  from ad_group_report
    where ad_group_id = '${adGroupId}'
  order by date desc
  limit 1
`).then(res => res.rows[0]);


const adGroupPerformanceReduced = ({ knex, adGroupId, from, to }) => knex.raw(`
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
    from "ad_group_report" where "ad_group_id" = '${adGroupId}' and date::INT between ${moment(from).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
    group by date
  ) as sub
`).then(res => res.rows[0]);

function createComparisonTimePeriods (from, to) {
  //  creates 2 pairs of dates from 1 pair of dates
  //  the new pair is of the same length as and before the intial date pair
  const periodFrom = from.clone();
  const periodTo = to.clone();
  const periodDurationDays = moment.duration(periodTo.diff(periodFrom)).asDays();
  return {
    prePeriod: {
      to : periodTo.subtract(periodDurationDays, 'days'),
      from: periodFrom.subtract(periodDurationDays, 'days'),
    },
    period: {
      to,
      from,
    },
  }
}

//  get percent change from fromDate to doDate metrics
const getAdGroupPerformanceDelta = async ({ knex, adGroupId, dates }) => {
  const performanceSelectedPeriod = await adGroupPerformanceReduced({ knex, adGroupId, from: dates.period.from, to: dates.period.to });
  const performancePreviousPeriod = await adGroupPerformanceReduced({ knex, adGroupId, from: dates.prePeriod.from, to: dates.prePeriod.to });
  
  //  merge metricsFrom with metricsTo into
  //  one obj with percent change as values
  return R.mergeWithKey((k, from, to) => {
    // const percentChange = ((to - from) / from);
    const percentChange = (from / to) - 1;
    //  dont return infinitiy, null instead
    if (percentChange === Infinity) return null;
    return percentChange;
  }, performanceSelectedPeriod, performancePreviousPeriod)
};

const getKeywords = ({
  knex,
  adGroupId,
  from,
  to
}) => { 
  console.log('adgroupId', adGroupId);
  return knex.raw(`
  select
    keyword_id as id,
    max(keyword_text) as term,
    (select bid from active_keyword where keyword_id = parent.keyword_id order by date desc limit 1)
  from active_keyword parent
    where ad_group_id = '${adGroupId}'
  and date::INT between ${moment(from).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
  group by keyword_id;
`).then(res => res.rows);

}


export default {
  Query: {
    AdGroup: (parent, { id: adGroupId }, { handler }) => getAdGroup({
      knex: handler.knex,
      adGroupId
    }),
  },
  AdGroup: {
    AdGroupPerformanceDelta: async ({ id: adGroupId }, { from, to }, { handler, user }) => { 
      const dates = createComparisonTimePeriods(from || user.filterDateFrom, to || user.filterDateTo);
      return getAdGroupPerformanceDelta({
        knex: handler.knex,
        adGroupId,
        dates,
      });
    },
    AdGroupPerformanceReduced: ({ id: adGroupId }, { from, to }, { handler, user }) => adGroupPerformanceReduced({
      knex: handler.knex,
      adGroupId,
      from: from || user.filterDateFrom,
      to: to || user.filterDateTo
    }),
    Keywords: ({ id: adGroupId }, { from, to }, { handler, user }) => getKeywords({
      knex: handler.knex,
      adGroupId,
      from: from || user.filterDateFrom,
      to: to || user.filterDateTo
    })
  }
}