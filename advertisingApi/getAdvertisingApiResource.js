import axios from 'axios';
import db from '../db';

const america = ['US', 'MX', 'CA'];

function getApiEndpoint(region) {
  if (america.includes(region)) return process.env.US_ADVERTISING_API_ENPOINT;
  return process.env.EU_ADVERTISING_API_ENPOINT;
}

export default async function getAdvertisingApiResource(
  resource,
  accessToken,
  profileId,
  region,
  stateFilter
) {
  //  find the correct profiles region if we don't give one as parameter
  let regionToUse = region;
  if (region === undefined) {
    regionToUse = await db.sellerProfile.find({ profileId }).then(res => res[0]);
  }

  const request = {
    method: 'GET',
    baseURL: getApiEndpoint(regionToUse),
    url: `/v2/${resource}`,
    headers: {
      'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`
    }
  };

  if (profileId) request.headers['Amazon-Advertising-API-Scope'] = profileId;
  if (stateFilter) request.url += `?stateFilter=${stateFilter}`;

  return axios(request)
    .then(res => {
      // console.log(res.data);
      return res.data;
    })
    .catch(err => console.log('get api resource error', err));
}
