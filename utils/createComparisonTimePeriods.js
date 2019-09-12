import moment from 'moment';

export default function createComparisonTimePeriods(from, to) {
  //  creates 2 pairs of dates from 1 pair of dates
  //  the new pair is of the same length as and before the intial date pair
  const periodFrom = from.clone();
  const periodTo = to.clone();
  const periodDurationDays = moment.duration(periodTo.diff(periodFrom)).asDays();
  return {
    prePeriod: {
      to: periodTo.subtract(periodDurationDays, 'days'),
      from: periodFrom.subtract(periodDurationDays, 'days')
    },
    period: {
      to,
      from
    }
  };
}
