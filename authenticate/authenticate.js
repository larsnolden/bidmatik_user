import axios from 'axios';
import jwt from 'jsonwebtoken';
import qs from 'query-string';
import db from '../db';

const getApiUser = async accessToken =>
  axios({
    baseURL: 'https://api.amazon.com',
    url: '/user/profile',
    method: 'GET',
    headers: {
      'x-amz-access-token': accessToken
    }
  }).then(res => res.data);

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
    }).then(res => res.data);

    if (amazonUserId) {
      //  check if the user already Exists or create a new one

      //  remove unecessary parts of amazon user id
      const userId = amazonUserId.split('.')[2];

      //  TODO: insert analytics
      console.log('user authentication', userId, email, name);

      //  attempt to find user
      const user = await db.user.find({ userId }).then(res => res[0]);
      if (!user) {
        //  user does not exist
        console.log('authentication, user does not exist', userId);

        //  save user
        await db.user.set({
          userId,
          email,
          name,
          refreshToken,
          accessToken
        });
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
  if (isProduction) console.log(`found valid session for token with user ${user.email}`);
  return user;
};
