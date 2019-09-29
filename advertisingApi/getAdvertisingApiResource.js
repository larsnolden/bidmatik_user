import axios from 'axios';

export default async function getAdvertisingApiResource(
  resource,
  accessToken,
  profileId,
  stateFilter
) {
  const request = {
    method: 'GET',
    url: `${process.env.ADVERTISING_API_ENPOINT}/v2/${resource}`,
    headers: {
      'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`
    }
  };

  if (profileId) request.headers['Amazon-Advertising-API-Scope'] = profileId;
  if (stateFilter) request.url += `?stateFilter=${stateFilter}`;

  return axios(request)
    .then(res => {
      console.log(res.data);
      return res.data;
    })
    .catch(err => console.log('get api resource error', err));
}
