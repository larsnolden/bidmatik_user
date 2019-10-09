import getAdvertisingApiResource from './getAdvertisingApiResource';

function getKeywordsByAdGroup({ adGroupId, profileId, accessToken }) {
  return getAdvertisingApiResource(`keywords?adGroupIdFilter=${adGroupId}`, accessToken, profileId);
}

function getCampaignsByProfile({ profileId, accessToken }) {
  return getAdvertisingApiResource('campaigns', accessToken, profileId);
}

function getAdgroupsByCampaign({ campaignId, profileId, accessToken }) {
  return getAdvertisingApiResource(
    `adGroups?campaignIdFilter=${campaignId}`,
    accessToken,
    profileId
  );
}

function getAdgroupById({ adGroupId, profileId, accessToken }) {
  return getAdvertisingApiResource(`adGroups/${adGroupId}`, accessToken, profileId);
}

export default {
  getKeywordsByAdGroup,
  getCampaignsByProfile,
  getAdgroupsByCampaign,
  getAdgroupById
};
