import R from 'ramda';

export default async ({ knex, getPerformance, dates }) => {
  const performanceSelectedPeriod = await getPerformance({
    from: dates.period.from,
    to: dates.period.to
  });
  const performancePreviousPeriod = await getPerformance({
    from: dates.prePeriod.from,
    to: dates.prePeriod.to
  });

  //  merge metricsFrom with metricsTo into
  //  one obj with percent change as values
  return R.mergeWithKey(
    (k, from, to) => {
      // const percentChange = ((to - from) / from);
      const percentChange = from / to - 1;
      //  dont return infinitiy, null instead
      if (percentChange === Infinity) return null;
      return percentChange;
    },
    performanceSelectedPeriod,
    performancePreviousPeriod
  );
};
