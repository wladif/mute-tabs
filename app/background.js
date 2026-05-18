// background.js

async function shouldMute(url) {
  if (!url) return false;

  const { mutedDomains = [] } = await chrome.storage.local.get(['mutedDomains']);

  try {
    const hostname = new URL(url).hostname;
    return mutedDomains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch (e) {
    return false;
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.status !== 'complete') return;

  const url = changeInfo.url || tab.url;
  const mute = await shouldMute(url);

  if (mute) {
    if (!tab.mutedInfo?.muted) chrome.tabs.update(tabId, { muted: true });
    return;
  }

  // Only unmute tabs that we ourselves muted, so we don't override the user
  // or another extension.
  const info = tab.mutedInfo;
  if (info?.muted && info.reason === 'extension' && info.extensionId === chrome.runtime.id) {
    chrome.tabs.update(tabId, { muted: false });
  }
});
