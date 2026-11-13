// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const statusText = document.getElementById('status-text');
  const toggleBtn = document.getElementById('toggle-btn');
  const listItems = document.getElementById('list-items');
  const emptyState = document.getElementById('empty-state');
  const clearAllBtn = document.getElementById('btn-clear-all');
  const countBadge = document.getElementById('count');
  const siteBadge = document.getElementById('site-badge');
  const hintMsg = document.getElementById('hint-msg');

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
    statusText.textContent = currentHostname;
  } else {
    statusText.textContent = 'Not available';
    hintMsg.textContent = 'Cannot mute this page.';
    hintMsg.classList.add('error');
  }

  let hintTimer;
  function setHint(msg, isError = false) {
    hintMsg.textContent = msg;
    hintMsg.classList.toggle('error', isError);
    clearTimeout(hintTimer);
    if (!isError && msg) {
      hintTimer = setTimeout(() => {
        if (hintMsg.textContent === msg) hintMsg.textContent = '';
      }, 2500);
    }
  }

  function updateCount(domains) {
    countBadge.textContent = domains.length === 1 ? '1 domain' : `${domains.length} domains`;
  }

  async function updateView() {
    const { mutedDomains = [] } = await chrome.storage.local.get(['mutedDomains']);

    if (currentHostname) {
      const isMuted = mutedDomains.includes(currentHostname);
      toggleBtn.disabled = false;
      toggleBtn.textContent = isMuted ? 'Unmute this site' : 'Mute this site';
      toggleBtn.onclick = isMuted
        ? () => removeDomain(currentHostname)
        : () => addDomain(currentHostname);

      siteBadge.textContent = isMuted ? 'Muted' : 'Not muted';
      siteBadge.className = `site-badge ${isMuted ? 'muted' : 'unmuted'}`;
    }

    renderList(mutedDomains);
  }

  async function addDomain(domain) {
    const { mutedDomains = [] } = await chrome.storage.local.get(['mutedDomains']);
    if (!mutedDomains.includes(domain)) {
      await chrome.storage.local.set({ mutedDomains: [...mutedDomains, domain] });
      chrome.tabs.update(currentTab.id, { muted: true });
      setHint(`Muted ${domain}.`);
    }
  }

  async function removeDomain(domain) {
    const { mutedDomains = [] } = await chrome.storage.local.get(['mutedDomains']);
    await chrome.storage.local.set({ mutedDomains: mutedDomains.filter(d => d !== domain) });
    if (currentTab && domain === currentHostname) {
      chrome.tabs.update(currentTab.id, { muted: false });
    }
    setHint(`Unmuted ${domain}.`);
  }

  async function clearAll() {
    const { mutedDomains = [] } = await chrome.storage.local.get(['mutedDomains']);
    if (mutedDomains.length === 0) return;

    await chrome.storage.local.set({ mutedDomains: [] });
    if (currentTab && currentHostname && mutedDomains.includes(currentHostname)) {
      chrome.tabs.update(currentTab.id, { muted: false });
    }
    setHint('Muted list cleared.');
  }

  function renderList(domains) {
    updateCount(domains);

    listItems.querySelectorAll('.domain-item').forEach(el => el.remove());

    emptyState.style.display = domains.length === 0 ? 'block' : 'none';
    clearAllBtn.style.display = domains.length === 0 ? 'none' : 'block';

    domains.forEach(domain => {
      const div = document.createElement('div');
      div.className = 'domain-item';

      const dot = document.createElement('div');
      dot.className = 'domain-dot';

      const span = document.createElement('span');
      span.className = 'domain-name';
      span.textContent = domain;
      span.title = domain;

      const button = document.createElement('button');
      button.className = 'btn-remove';
      button.textContent = '×';
      button.setAttribute('aria-label', `Remove ${domain}`);
      button.onclick = () => removeDomain(domain);

      div.appendChild(dot);
      div.appendChild(span);
      div.appendChild(button);
      listItems.appendChild(div);
    });
  }

  clearAllBtn.addEventListener('click', async () => {
    if (confirm('Remove all muted domains?')) await clearAll();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.mutedDomains) updateView();
  });

  updateView();
});
