const DEFAULT_API_BASE_URL = 'http://localhost:4000/api';
const DEFAULT_APP_BASE_URL = 'http://localhost:8080';
const STORAGE_KEYS = {
  apiBaseUrl: 'recall_api_base_url',
  appBaseUrl: 'recall_app_base_url',
};

const elements = {
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  appBaseUrl: document.getElementById('appBaseUrl'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  form: document.getElementById('captureForm'),
  submitBtn: document.getElementById('submitBtn'),
  status: document.getElementById('status'),
  openNoteLink: document.getElementById('openNoteLink'),
  platform: document.getElementById('platform'),
  difficulty: document.getElementById('difficulty'),
  title: document.getElementById('title'),
  link: document.getElementById('link'),
  tags: document.getElementById('tags'),
  problemStatement: document.getElementById('problemStatement'),
  language: document.getElementById('language'),
  confidence: document.getElementById('confidence'),
  code: document.getElementById('code'),
  approachName: document.getElementById('approachName'),
  approachNotes: document.getElementById('approachNotes'),
  siteChip: document.getElementById('siteChip'),
  successOverlay: document.getElementById('successOverlay'),
};

let activeTab = null;

function stripSiteSuffix(rawTitle) {
  return (rawTitle || '')
    .replace(/\s*[-|]\s*(LeetCode|Codeforces|GeeksforGeeks|Code360|Coding Ninjas|Naukri).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toOrigin(urlLike) {
  try {
    return new URL(urlLike).origin;
  } catch {
    return '';
  }
}

function normalizeApiBaseUrl(value) {
  let next = (value || '').trim() || DEFAULT_API_BASE_URL;
  if (!/^https?:\/\//i.test(next)) {
    next = `http://${next}`;
  }
  next = toOrigin(next) || next.replace(/\/+$/, '');
  next = next.replace(':8080', ':4000').replace(':5173', ':4000');
  if (!/\/api$/i.test(next)) {
    next = `${next}/api`;
  }
  return next;
}

function normalizeAppBaseUrl(value) {
  let next = (value || '').trim() || DEFAULT_APP_BASE_URL;
  if (!/^https?:\/\//i.test(next)) {
    next = `http://${next}`;
  }
  return (toOrigin(next) || next).replace(/\/+$/, '');
}

function deriveAppBaseUrl(apiBaseUrl) {
  const normalizedApi = normalizeApiBaseUrl(apiBaseUrl);
  const withoutApi = normalizedApi.replace(/\/api$/i, '');
  if (withoutApi.includes(':4000')) {
    return withoutApi.replace(':4000', ':8080');
  }
  return withoutApi;
}

function splitTags(raw) {
  const seen = new Set();
  return (raw || '')
    .split(/[\n,]/)
    .map(tag => tag.trim())
    .filter(Boolean)
    .filter(tag => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function setStatus(message, type = 'info') {
  elements.status.textContent = message || '';
  elements.status.className = `status ${type}`;
}

function setSiteChip(message) {
  if (!elements.siteChip) return;
  elements.siteChip.textContent = message || 'Waiting for analysis...';
}

function setLoading(loading) {
  elements.submitBtn.disabled = loading;
  elements.analyzeBtn.disabled = loading;
  elements.submitBtn.classList.toggle('is-loading', loading);
  const submitText = elements.submitBtn.querySelector('.btn-text');
  if (submitText) {
    submitText.textContent = loading ? 'Creating...' : 'Create Note';
  }
  const analyzeText = elements.analyzeBtn.querySelector('.btn-text');
  if (analyzeText) {
    analyzeText.textContent = loading ? 'Please wait...' : 'Analyze Current Page';
  }
}

function clampConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(5, Math.max(1, Math.round(parsed)));
}

function createId() {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function computeRevisionInterval(confidence) {
  if (confidence <= 2) return 1;
  if (confidence === 3) return 3;
  if (confidence === 4) return 7;
  return 14;
}

function getNextRevisionDate(interval) {
  const date = new Date();
  date.setDate(date.getDate() + interval);
  return date.toISOString();
}

function buildLegacyNotePayload(payload) {
  const now = new Date().toISOString();
  const confidence = clampConfidence(payload.confidence);
  const revisionInterval = computeRevisionInterval(confidence);
  const id = createId();
  const solutionId = createId();

  return {
    id,
    title: payload.title,
    platform: payload.platform || 'Other',
    link: payload.link || '',
    difficulty: payload.difficulty || 'Medium',
    tags: payload.tags || [],
    groups: [],
    problemStatement: payload.problemStatement || '',
    notes: '',
    approach: payload.approachNotes || '',
    mistakes: '',
    code: payload.code || '',
    language: payload.language || 'cpp',
    solutions: [
      {
        id: solutionId,
        title: payload.approachName || 'Approach 1',
        notes: payload.approachNotes || '',
        code: payload.code || '',
        language: payload.language || 'cpp',
        isPinned: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    isPinned: false,
    isFavorite: false,
    confidence,
    revisionInterval,
    nextRevisionDate: getNextRevisionDate(revisionInterval),
    createdAt: now,
    updatedAt: now,
  };
}

async function extractErrorMessage(response, fallback) {
  try {
    const errorPayload = await response.json();
    if (errorPayload?.message) {
      return errorPayload.details ? `${errorPayload.message}: ${errorPayload.details}` : errorPayload.message;
    }
  } catch {
    // Ignore JSON parse errors and return fallback.
  }
  return fallback;
}

async function createNoteThroughApi(apiBaseUrl, payload) {
  const importEndpoint = `${apiBaseUrl}/notes/import`;
  const importResponse = await fetch(importEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (importResponse.ok) {
    return { note: await importResponse.json(), mode: 'import' };
  }

  if (importResponse.status === 404) {
    const legacyEndpoint = `${apiBaseUrl}/notes`;
    const legacyPayload = buildLegacyNotePayload(payload);
    const legacyResponse = await fetch(legacyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(legacyPayload),
    });

    if (!legacyResponse.ok) {
      const fallbackMessage = `Fallback failed (${legacyResponse.status}) at ${legacyEndpoint}`;
      throw new Error(await extractErrorMessage(legacyResponse, fallbackMessage));
    }

    return { note: await legacyResponse.json(), mode: 'legacy' };
  }

  const fallbackMessage = `Request failed (${importResponse.status}) at ${importEndpoint}`;
  throw new Error(await extractErrorMessage(importResponse, fallbackMessage));
}

async function playSuccessAnimation() {
  if (!elements.successOverlay) return;
  elements.successOverlay.hidden = false;
  elements.successOverlay.classList.remove('show');
  void elements.successOverlay.offsetWidth;
  elements.successOverlay.classList.add('show');

  await new Promise(resolve => setTimeout(resolve, 1300));

  elements.successOverlay.classList.remove('show');
  await new Promise(resolve => setTimeout(resolve, 220));
  elements.successOverlay.hidden = true;
}

function fillForm(scraped) {
  if (!scraped || typeof scraped !== 'object') return;
  elements.platform.value = scraped.platform || 'Other';
  elements.difficulty.value = scraped.difficulty || 'Medium';
  elements.title.value = scraped.title || elements.title.value;
  elements.link.value = scraped.link || elements.link.value;
  elements.tags.value = Array.isArray(scraped.tags) ? scraped.tags.join(', ') : elements.tags.value;
  elements.problemStatement.value = scraped.problemStatement || elements.problemStatement.value;
  elements.code.value = scraped.code || elements.code.value;
  elements.language.value = scraped.language || elements.language.value || 'cpp';
  setSiteChip(`${scraped.platform || 'Site'} detected`);
}

function buildPayload() {
  return {
    title: elements.title.value.trim(),
    platform: elements.platform.value,
    link: elements.link.value.trim(),
    difficulty: elements.difficulty.value,
    tags: splitTags(elements.tags.value),
    problemStatement: elements.problemStatement.value.trim(),
    code: elements.code.value,
    language: elements.language.value || 'cpp',
    approachName: elements.approachName.value.trim(),
    approachNotes: elements.approachNotes.value.trim(),
    confidence: clampConfidence(elements.confidence.value),
  };
}

async function storageGet(keys) {
  return new Promise(resolve => {
    chrome.storage.sync.get(keys, resolve);
  });
}

async function storageSet(values) {
  return new Promise(resolve => {
    chrome.storage.sync.set(values, resolve);
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function requestScrape(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: 'RECALL_CAPTURE_SCRAPE' }, response => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      if (!response) {
        reject(new Error('No scrape response from page'));
        return;
      }

      if (response.ok === false) {
        reject(new Error(response.error || 'Unable to analyze this page'));
        return;
      }

      resolve(response.data || response);
    });
  });
}

async function analyzeCurrentTab() {
  if (!activeTab || !activeTab.id) {
    setStatus('No active tab found.', 'error');
    return;
  }

  setStatus('Analyzing page...', 'info');
  setSiteChip('Analyzing current site...');
  elements.openNoteLink.hidden = true;

  try {
    const scraped = await requestScrape(activeTab.id);
    fillForm(scraped);
    if (!elements.approachName.value.trim()) {
      elements.approachName.value = 'Approach 1';
    }
    setStatus('Page analyzed. Review fields and create note.', 'success');
  } catch (error) {
    if (activeTab.url) {
      elements.link.value = activeTab.url;
    }
    if (activeTab.title && !elements.title.value.trim()) {
      elements.title.value = stripSiteSuffix(activeTab.title);
    }
    try {
      const hostname = new URL(activeTab.url).hostname.replace(/^www\./, '');
      setSiteChip(hostname);
    } catch {
      setSiteChip('Manual mode');
    }
    setStatus(`Could not auto-analyze: ${error.message}`, 'error');
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const payload = buildPayload();
  if (!payload.title) {
    setStatus('Title is required.', 'error');
    return;
  }
  if (!payload.approachName) {
    setStatus('Approach name is required.', 'error');
    return;
  }

  const apiBaseUrl = normalizeApiBaseUrl(elements.apiBaseUrl.value);
  const appBaseUrl = normalizeAppBaseUrl(elements.appBaseUrl.value);
  elements.apiBaseUrl.value = apiBaseUrl;
  elements.appBaseUrl.value = appBaseUrl;
  elements.confidence.value = String(payload.confidence);

  setLoading(true);
  setStatus('Creating note in Recall Well...', 'info');
  elements.openNoteLink.hidden = true;

  try {
    await storageSet({
      [STORAGE_KEYS.apiBaseUrl]: apiBaseUrl,
      [STORAGE_KEYS.appBaseUrl]: appBaseUrl,
    });

    const { note: created, mode } = await createNoteThroughApi(apiBaseUrl, payload);
    setStatus(mode === 'legacy' ? 'Note created successfully (compatibility mode).' : 'Note created successfully.', 'success');
    await playSuccessAnimation();

    if (created?.id) {
      elements.openNoteLink.href = `${appBaseUrl}/note/${encodeURIComponent(created.id)}`;
      elements.openNoteLink.hidden = false;
    }
  } catch (error) {
    setStatus(`Failed to create note: ${error.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

async function initialize() {
  const stored = await storageGet([STORAGE_KEYS.apiBaseUrl, STORAGE_KEYS.appBaseUrl]);
  const storedApiBaseUrl = stored[STORAGE_KEYS.apiBaseUrl];
  const storedAppBaseUrl = stored[STORAGE_KEYS.appBaseUrl];

  const apiBaseUrl = normalizeApiBaseUrl(storedApiBaseUrl || DEFAULT_API_BASE_URL);
  const appBaseUrl = normalizeAppBaseUrl(storedAppBaseUrl || deriveAppBaseUrl(apiBaseUrl));
  elements.apiBaseUrl.value = apiBaseUrl;
  elements.appBaseUrl.value = appBaseUrl;

  activeTab = await getActiveTab();
  if (activeTab?.url) {
    elements.link.value = activeTab.url;
    try {
      const hostname = new URL(activeTab.url).hostname.replace(/^www\./, '');
      setSiteChip(hostname);
    } catch {
      setSiteChip('Waiting for analysis...');
    }
  }
  if (activeTab?.title) {
    elements.title.value = stripSiteSuffix(activeTab.title);
  }
  if (!elements.approachName.value.trim()) {
    elements.approachName.value = 'Approach 1';
  }

  elements.analyzeBtn.addEventListener('click', analyzeCurrentTab);
  elements.form.addEventListener('submit', handleSubmit);

  await analyzeCurrentTab();
}

initialize().catch(error => {
  setStatus(`Initialization failed: ${error.message}`, 'error');
});
