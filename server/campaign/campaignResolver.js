import moment from 'moment';
import * as R from 'ramda';


const CampaignPerformanceReduced = ({ knex, campaignId, from, to }) => knex.raw(`
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
    from "campaign_report" where "campaign_id" = '${campaignId}' and date::INT between ${moment(from).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
    group by date
  ) as sub
`).then(res => res.rows[0]);

// const CampaignPerformanceReduced = (knex, campaignId, from, to) => knex.schema.raw(`
//   select
//     sum(sub.clicks) as clicks,
//     sum(sub.impressions) as impressions,
//     avg(sub.ctr) as ctr,
//     sum(sub.spend) as spend,
//     sum(sub.orders) as orders,
//     sum(sub.revenue) as revenue,
//     avg(sub.acos) as acos
//   from
//   (
//     select
//       max(clicks) as clicks,
//       max(impressions) as impressions,
//       avg(clicks)/NULLIF(avg(impressions),0) as ctr,
//       max(cost) as spend,
//       max(attributed_units_ordered_1_d) as orders,
//       max(attributed_sales_1_d_same_sku) as revenue,
//       avg(cost/NULLIF(attributed_sales_1_d_same_sku,0)) as acos,
//       date
//     from "campaign_report" where "campaign_id" = '${campaignId}' and date::INT between ${moment(from).format('YYYYMMDD')} and ${moment(to).format('YYYYMMDD')}
//     group by date
//   ) as sub
// `).then(res => res.rows[0]);

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
const getCampaignPerformanceDelta = async (knex, campaignId, dates) => {
  const performanceSelectedPeriod = await CampaignPerformanceReduced({ knex, campaignId, from: dates.period.from, to: dates.period.to });
  const performancePreviousPeriod = await CampaignPerformanceReduced({ knex, campaignId, from: dates.prePeriod.from, to: dates.prePeriod.to });
  
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

export default {
  Campaign: {
    CampaignPerformanceDelta: async ({ id: campaignId }, { from, to }, { handler, user }) => { 
      const dates = createComparisonTimePeriods(from || user.filterDateFrom, to || user.filterDateTo);
      return getCampaignPerformanceDelta(handler.knex, campaignId, dates);
    },
    CampaignPerformanceReduced: async ({ id: campaignId }, { from, to }, { handler, user }) => await CampaignPerformanceReduced({ knex: handler.knex, campaignId, from: from || user.filterDateFrom , to: to || user.filterDateTo })
  }
}