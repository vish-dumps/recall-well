(() => {
  const MAX_STATEMENT_LENGTH = 80000;
  const MAX_CODE_LENGTH = 40000;
  const MESSAGE_TYPE = 'RECALL_CAPTURE_SCRAPE';
  const IGNORE_TAGS = new Set([
    'problem',
    'problems',
    'discuss',
    'discussion',
    'editorial',
    'solution',
    'submit',
    'submissions',
    'description',
    'constraints',
    'hint',
    'hints',
    'practice',
    'topics',
  ]);

  function normalizeWhitespace(text) {
    return (text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function normalizeCode(text) {
    return (text || '').replace(/\u00a0/g, ' ').replace(/\r/g, '').trim();
  }

  function clampText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}\n...[truncated]`;
  }

  function unique(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function firstText(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const text = normalizeWhitespace(element.innerText || element.textContent || '');
      if (text) return text;
    }
    return '';
  }

  function allTexts(selectors) {
    const values = [];
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        const text = normalizeWhitespace(element.innerText || element.textContent || '');
        if (text) values.push(text);
      });
    });
    return values;
  }

  function longestText(selectors) {
    let best = '';
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        const text = normalizeWhitespace(element.innerText || element.textContent || '');
        if (text.length > best.length) {
          best = text;
        }
      });
    });
    return best;
  }

  function getMetaContent(attr, value) {
    const meta = document.querySelector(`meta[${attr}="${value}"]`);
    return normalizeWhitespace(meta?.getAttribute('content') || '');
  }

  function detectPlatform() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('leetcode.com')) return 'LeetCode';
    if (host.includes('codeforces.com')) return 'Codeforces';
    if (host.includes('geeksforgeeks.org')) return 'GFG';
    if (host.includes('codingninjas.com') || host.includes('naukri.com')) return 'Code360';
    if (host.includes('hackerrank.com')) return 'HackerRank';
    if (host.includes('codechef.com')) return 'CodeChef';
    if (host.includes('atcoder.jp')) return 'AtCoder';
    return 'Other';
  }

  function stripSiteSuffix(rawTitle) {
    return (rawTitle || '')
      .replace(/\s*[-|]\s*(LeetCode|Codeforces|GeeksforGeeks|Code360|Coding Ninjas|Naukri).*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeDifficulty(raw) {
    const next = normalizeWhitespace(raw).toLowerCase();
    if (!next) return '';
    if (next.includes('easy')) return 'Easy';
    if (next.includes('medium')) return 'Medium';
    if (next.includes('hard')) return 'Hard';
    return '';
  }

  function difficultyFromRating(rating) {
    if (!Number.isFinite(rating)) return '';
    if (rating <= 1200) return 'Easy';
    if (rating <= 1800) return 'Medium';
    return 'Hard';
  }

  function extractDifficulty(platform) {
    if (platform === 'Codeforces') {
      const tagTexts = allTexts(['.tag-box', '.problem-statement .header']);
      const ratingText = tagTexts.find(text => /\*?\s*(\d{3,4})/.test(text));
      if (ratingText) {
        const parsed = Number((ratingText.match(/(\d{3,4})/) || [])[1]);
        const mapped = difficultyFromRating(parsed);
        if (mapped) return mapped;
      }
    }

    const selectorTexts = allTexts([
      '[class*="difficulty"]',
      '[data-difficulty]',
      'span[class*="text-difficulty"]',
      'div[class*="text-difficulty"]',
      '.text-difficulty-easy',
      '.text-difficulty-medium',
      '.text-difficulty-hard',
      '.tag-box',
      '[class*="problemDifficulty"]',
    ]);

    for (const candidate of selectorTexts) {
      const normalized = normalizeDifficulty(candidate);
      if (normalized) return normalized;
    }

    const bodyPreview = normalizeWhitespace(document.body?.innerText || '').slice(0, 12000);
    const match = bodyPreview.match(/\b(Easy|Medium|Hard)\b/i);
    if (match) {
      return normalizeDifficulty(match[0]) || 'Medium';
    }

    return 'Medium';
  }

  function normalizeTag(rawTag) {
    const tag = normalizeWhitespace(rawTag).replace(/^#/, '');
    if (!tag) return '';
    if (tag.length > 32) return '';
    if (/^[^a-zA-Z0-9]+$/.test(tag)) return '';
    if (IGNORE_TAGS.has(tag.toLowerCase())) return '';
    return tag;
  }

  function extractTags(platform) {
    const selectorsByPlatform = {
      LeetCode: ['a[href*="/tag/"]', '[data-cy="topic-tag"]', '[class*="topic-tag"]'],
      Codeforces: ['.tag-box'],
      Code360: ['a[href*="tag"]', '[class*="tag"]', '[class*="topic"]'],
      GFG: ['a[href*="/tag/"]', '[class*="tag"]'],
      Other: ['a[href*="/tag/"]', '[class*="tag"]'],
    };

    const tags = [];
    const platformSelectors = selectorsByPlatform[platform] || selectorsByPlatform.Other;
    tags.push(...allTexts(platformSelectors));

    const keywords = getMetaContent('name', 'keywords');
    if (keywords) {
      keywords.split(',').forEach(keyword => tags.push(normalizeWhitespace(keyword)));
    }

    return unique(
      tags
        .map(normalizeTag)
        .filter(Boolean)
    ).slice(0, 12);
  }

  function extractTitle(platform) {
    const selectorsByPlatform = {
      LeetCode: ['div[data-cy="question-title"]', 'a[href*="/problems/"]', 'h1'],
      Codeforces: ['.problem-statement .title', '.problemindexholder .title', 'h1'],
      Code360: ['h1', '[class*="title"]'],
      GFG: ['h1', '[class*="problem-title"]'],
      Other: ['h1', 'title'],
    };

    const selectors = selectorsByPlatform[platform] || selectorsByPlatform.Other;
    const fromSelectors = firstText(selectors);
    if (fromSelectors) return stripSiteSuffix(fromSelectors);

    const ogTitle = getMetaContent('property', 'og:title');
    if (ogTitle) return stripSiteSuffix(ogTitle);

    const fallbackTitle = stripSiteSuffix(document.title);
    return fallbackTitle || 'Untitled Problem';
  }

  function extractProblemStatement(platform) {
    const selectorsByPlatform = {
      LeetCode: [
        '[data-track-load="description_content"]',
        '[class*="question-content"]',
        '[class*="description"]',
        '[class*="content__"]',
      ],
      Codeforces: ['.problem-statement', '.problemindexholder .problem-statement'],
      Code360: ['[class*="problem-statement"]', '[class*="problemStatement"]', '[class*="description"]', 'main'],
      GFG: ['[class*="problem-statement"]', '[class*="problem_content"]', 'article', 'main'],
      Other: ['.problem-statement', 'article', 'main', '[role="main"]'],
    };

    const fromSelectors = longestText(selectorsByPlatform[platform] || selectorsByPlatform.Other);
    if (fromSelectors && fromSelectors.length > 120) {
      return clampText(fromSelectors, MAX_STATEMENT_LENGTH);
    }

    const ogDescription = getMetaContent('property', 'og:description') || getMetaContent('name', 'description');
    if (ogDescription) {
      return clampText(ogDescription, MAX_STATEMENT_LENGTH);
    }

    const fallback = normalizeWhitespace(document.body?.innerText || '');
    return clampText(fallback, MAX_STATEMENT_LENGTH);
  }

  function extractMonacoCode() {
    const lines = Array.from(document.querySelectorAll('.monaco-editor .view-line'))
      .map(element => element.textContent || '')
      .join('\n');
    return normalizeCode(lines);
  }

  function extractCodeMirrorCode() {
    const lines = Array.from(document.querySelectorAll('.CodeMirror-line'))
      .map(element => element.textContent || '')
      .join('\n');
    return normalizeCode(lines);
  }

  function extractCode() {
    const textareaCandidates = Array.from(
      document.querySelectorAll(
        'textarea.inputarea, textarea[class*="editor"], textarea[class*="code"], textarea[name*="code"]'
      )
    )
      .map(element => normalizeCode(element.value || element.textContent || ''))
      .filter(code => code.length > 20);

    if (textareaCandidates.length > 0) {
      return clampText(textareaCandidates[0], MAX_CODE_LENGTH);
    }

    const monacoCode = extractMonacoCode();
    if (monacoCode.length > 20) {
      return clampText(monacoCode, MAX_CODE_LENGTH);
    }

    const codemirrorCode = extractCodeMirrorCode();
    if (codemirrorCode.length > 20) {
      return clampText(codemirrorCode, MAX_CODE_LENGTH);
    }

    const preCandidates = Array.from(document.querySelectorAll('pre code, pre'))
      .map(element => normalizeCode(element.textContent || element.innerText || ''))
      .filter(code => code.length > 20);

    if (preCandidates.length > 0) {
      return clampText(preCandidates[0], MAX_CODE_LENGTH);
    }

    return '';
  }

  function normalizeLanguage(raw) {
    const value = normalizeWhitespace(raw).toLowerCase();
    if (!value) return '';
    if (value.includes('c++') || value === 'cpp' || value === 'c') return 'cpp';
    if (value.includes('java') && !value.includes('javascript')) return 'java';
    if (value.includes('python') || value === 'py') return 'python';
    if (value.includes('typescript') || value === 'ts') return 'typescript';
    if (value.includes('javascript') || value === 'js') return 'javascript';
    if (value.includes('c#') || value.includes('csharp') || value === 'cs') return 'csharp';
    if (value.includes('golang') || value === 'go') return 'go';
    if (value.includes('rust')) return 'rust';
    return '';
  }

  function guessLanguageFromCode(code) {
    if (!code) return '';
    if (/#include\s*</.test(code) || /\bstd::/.test(code)) return 'cpp';
    if (/public\s+class\s+\w+/.test(code) || /\bSystem\.out\.print/.test(code)) return 'java';
    if (/^\s*def\s+\w+\(/m.test(code) || /^\s*class\s+\w+:/m.test(code)) return 'python';
    if (/\bconsole\.log\(/.test(code) || /\bfunction\s+\w+\(/.test(code)) return 'javascript';
    if (/\binterface\s+\w+/.test(code) || /:\s*(string|number|boolean)\b/.test(code)) return 'typescript';
    if (/\busing\s+System\b/.test(code) || /\bnamespace\s+\w+/.test(code)) return 'csharp';
    if (/\bfunc\s+\w+\(/.test(code) || /\bpackage\s+main\b/.test(code)) return 'go';
    if (/\bfn\s+\w+\(/.test(code) || /\bimpl\s+\w+/.test(code)) return 'rust';
    return '';
  }

  function extractLanguage(code) {
    const candidates = allTexts([
      'select option:checked',
      '[id*="headlessui-listbox-button"]',
      'button[aria-haspopup="listbox"]',
      '[class*="language-selector"]',
      '[class*="lang-select"]',
    ]);

    for (const candidate of candidates) {
      const normalized = normalizeLanguage(candidate);
      if (normalized) return normalized;
    }

    return guessLanguageFromCode(code) || 'cpp';
  }

  function scrapePage() {
    const platform = detectPlatform();
    const title = extractTitle(platform);
    const difficulty = extractDifficulty(platform);
    const tags = extractTags(platform);
    const problemStatement = extractProblemStatement(platform);
    const code = extractCode();
    const language = extractLanguage(code);

    return {
      platform,
      title,
      difficulty,
      tags,
      problemStatement,
      code,
      language,
      link: window.location.href,
      capturedAt: new Date().toISOString(),
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== MESSAGE_TYPE) return;

    try {
      const data = scrapePage();
      sendResponse({ ok: true, data });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to capture page',
      });
    }
  });
})();
