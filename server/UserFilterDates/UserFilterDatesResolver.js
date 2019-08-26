import moment from 'moment';

const setUserFilterDates = async (db, userId, from, to) => {
  await db.user.set({
    userId,
    filterDateFrom: moment(from).format('YYYYMMDD'),
    filterDateTo: moment(to).format('YYYYMMDD'),
  });
  return {
    id: '1',
    from,
    to
  };
}

const getUserFilterDates = async (db, userId) => {
  const user = await db.user.find({ userId }).then(res => res[0]);
  if (!user.filterDateFrom || !user.filterDateTo) {
    console.log('generate initial filter dates');
    //  generate date pair after signup
    const from = moment(moment.now()).subtract(1, 'days').format('YYYYMMMDD');
    const to = moment(moment.now()).format('YYYYMMMDD');
    await setUserFilterDates(db, userId, from, to);
    return {
      from,
      to
    };
  };
  return {
    id: 1,
    from: user.filterDateFrom,
    to: user.filterDateTo
  };
}

export default {
  Mutation: {
    SetUserFilterDates: async (parent, { input }, { user, handler }) => await setUserFilterDates(handler.db, user.userId, input.from, input.to),
  },
  Query: {
    // not getting called
    UserFilterDates: async (parent, args, { user, handler }) => await getUserFilterDates(handler.db, user.userId),
  }
}