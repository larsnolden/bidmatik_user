import axios from 'axios';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import qs from 'query-string';
import db from '../db';
import getAdvertisingApiResource from '../advertisingApi/getAdvertisingApiResource';

const getApiUser = async accessToken =>
  axios({
    baseURL: 'https://api.amazon.com',
    url: '/user/profile',
    method: 'GET',
    headers: {
      'x-amz-access-token': accessToken
    }
  }).then(res => res.data);

async function updateSellerProfiles(accesToken, profileId, userId) {
  const usProfiles = await getAdvertisingApiResource('profiles', accesToken, profileId, 'US');
  const euProfiles = await getAdvertisingApiResource('profiles', accesToken, profileId, 'EU');

  const sellerProfiles = [...usProfiles, ...euProfiles];

  console.log('got seller profiles', sellerProfiles);

  const sellerProfilesSavePromises = sellerProfiles.map(async profile => {
    const { marketplaceStringId: marketplaceId, id: accountId, countryCode } = profile.accountInfo;

    const { profileName } = await axios
      .post(process.env.RESOLVE_PROFILE_NAME_ENDPOINT, {
        marketplaceId,
        accountId,
        countryCode
      })
      .then(res => res.data)
      .catch(err => {
        console.log(err);
        return 'not found';
      });

    console.log('profile', profile);

    //  save profile
    await db.sellerProfile.set({
      userId,
      profileId: profile.profileId,
      countryCode: profile.countryCode,
      currencyCode: profile.currencyCode,
      dailyBuget: profile.dailyBuget,
      timezone: profile.timezone,
      accountMarketplaceId: profile.accountInfo.marketplaceStringId,
      accountId: profile.accountInfo.id,
      type: profile.accountInfo.type,
      profileName
    });
  });

  await Promise.all(sellerProfilesSavePromises);
}

const createProductionSession = async authCode => {
  //  exchange client authentication code with user tokens
  const { access_token: accessToken, refresh_token: refreshToken } = await axios({
    baseURL: 'https://api.amazon.com',
    url: '/auth/o2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    data: qs.stringify({
      grant_type: 'authorization_code',
      code: authCode,
      client_id: process.env.AMAZON_CLIENT_ID,
      client_secret: process.env.AMAZON_CLIENT_SECRET
    })
  })
    .then(res => res.data)
    .catch(e => console.log('Amazon authentication error', e));

  if (accessToken && refreshToken) {
    //  get user info through access token
    const { user_id: amazonUserId, email, name } = await axios({
      baseURL: 'https://api.amazon.com',
      url: '/user/profile',
      method: 'GET',
      headers: {
        'x-amz-access-token': accessToken
      }
    })
      .then(res => res.data)
      .catch(e => console.log('Get Amazonon User Profile Error', e));

    if (amazonUserId) {
      //  check if the user already Exists or create a new one

      //  remove unecessary parts of amazon user id
      const userId = amazonUserId.split('.')[2];

      //  TODO: insert analytics
      console.log('user authentication', userId, email, name);

      //  attempt to find user
      let user = await db.user.find({ userId }).then(res => res[0]);
      if (!user) {
        //  user does not exist
        console.log('authentication, user does not exist', userId);

        //  save user
        await db.user.set({
          userId,
          email,
          name,
          filterDateFrom: moment(moment.now())
            .subtract(1, 'days')
            .format('YYYYMMDD'),
          filterDateTo: moment(moment.now()).format('YYYYMMDD'),
          refreshToken,
          accessToken
        });

        user = await db.user.find({ userId }).then(res => res[0]);
      }

      console.log('user', user);
      //  always update the users profiles for us and eu accounts
      await updateSellerProfiles(accessToken, user.profileId, user.userId);

      if (!user.activeSellerProfileId) {
        const { profileId: defaultSellerProfileId } = await db.sellerProfile
          .find({ userId: user.userId })
          .then(res => res[0]);

        await db.user.set({ userId: user.userId, activeSellerProfileId: defaultSellerProfileId });
        console.log(`Set defaultSellerProfileId for ${user.email} to ${defaultSellerProfileId}`);
      }

      //  generate token to identify user
      const token = jwt.sign(
        {
          id: userId,
          username: email
        },
        process.env.TOKEN_SECRET,
        { expiresIn: '30d' }
      );

      console.log('generated new user token', token);

      //  save token
      await db.user.set({
        userId,
        authenticationToken: token
      });
      return { token };
    }
  } else {
    console.log('Amazon did not supply tokens in exchange for auth code');
  }
};

const createDevelopmentSession = async () => {
  console.log('createDevelopmentSession');
  const user = {
    id: process.env.DEVELOPMENT_USER_ID,
    username: process.env.DEVELOPMENT_USER_EMAIL
  };

  const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: '30d' });

  await db.user.set({
    userId: user.id,
    authenticationToken: token
  });
  // createSession(token, user);
  return { token };
};

const isProduction = process.env.NODE_ENV === 'production';

export const AuthResolver = {
  Mutation: {
    createSession: async (_, { authCode }) =>
      isProduction ? createProductionSession(authCode) : createDevelopmentSession()
  }
};

export const authenticateSession = async request => {
  const token = request.headers.authentication || '';
  if (isProduction) console.log('authenticateSession with token');
  const user = await db.user.find({ authenticationToken: token }).then(res => res[0]);
  if (user && user.email) console.log(`found valid session for token with user ${user.email}`);
  if (!user) console.log(`could not find a valid session`);
  return user;
};
