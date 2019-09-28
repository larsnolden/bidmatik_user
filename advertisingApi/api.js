import getAdvertisingApiResource from './getAdvertisingApiResource';

function getKeywordsByAdGroup({ adGroupId, profileId, accessToken }) {
  return getAdvertisingApiResource(`keywords?adGroupIdFilter=${adGroupId}`, accessToken, profileId);
}

export default {
  getKeywordsByAdGroup
};
