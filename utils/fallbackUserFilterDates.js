import db from '../db'
export default async (userId) => {
  const user = await db.user.find({ userId }).then(res => res[0]);
  if (user.filterDateFrom && user.filterDateTo) {
    return {
      from: user.filterDateFrom,
      to: user.filterDateTo,
    }
  } else {
    const from = moment(moment.now()).subtract(1, 'days').format('YYYYMMMDD');
    const to = moment(moment.now()).format('YYYYMMMDD');
    return {
      from,
      to,
    }
  }
}