// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const statusText = document.getElementById('status-text');
  const toggleBtn = document.getElementById('toggle-btn');
  const listItems = document.getElementById('list-items');

  let currentTab = null;
  let currentHostname = null;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        currentTab = tab;
        currentHostname = url.hostname.replace(/^www\./, '');
      }
    } catch (e) { /* not a parseable URL — leave currentHostname null */ }
  }

  if (currentHostname) {
    statusText.textContent = `Site: ${currentHostname}`;
    toggleBtn.disabled = false;
  } else {
    statusText.textContent = "Cannot mute this page.";
  }

  async function updateView() {
    const { mutedDomains = [] } = await chrome.storage.local.get(['mutedDomains']);
    if (currentHostname) {
      if (mutedDomains.includes(currentHostname)) {
        toggleBtn.textContent = "Remove from Mute List";
        toggleBtn.onclick = () => removeDomain(currentHostname);
      } else {
        toggleBtn.textContent = "Add to Mute List";
        toggleBtn.onclick = () => addDomain(currentHostname);
      }
    }
    renderList(mutedDomains);
  }

  async function addDomain(domain) {
    const { mutedDomains = [] } = await chrome.storage.local.get(['mutedDomains']);
    if (!mutedDomains.includes(domain)) {
      await chrome.storage.local.set({ mutedDomains: [...mutedDomains, domain] });
      chrome.tabs.update(currentTab.id, { muted: true });
    }
  }

  async function removeDomain(domain) {
    const { mutedDomains = [] } = await chrome.storage.local.get(['mutedDomains']);
    await chrome.storage.local.set({ mutedDomains: mutedDomains.filter(d => d !== domain) });
    if (currentTab && domain === currentHostname) {
      chrome.tabs.update(currentTab.id, { muted: false });
    }
  }

  function renderList(domains) {
    listItems.textContent = '';
    domains.forEach(domain => {
      const div = document.createElement('div');
      div.className = 'domain-item';

      const span = document.createElement('span');
      span.textContent = domain;

      const button = document.createElement('button');
      button.className = 'remove-btn';
      button.textContent = '✕';
      button.onclick = () => removeDomain(domain);

      div.appendChild(span);
      div.appendChild(button);
      listItems.appendChild(div);
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.mutedDomains) updateView();
  });

  updateView();
});
