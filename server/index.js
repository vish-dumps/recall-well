import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recall-well';
const PROFILE_KEY = 'default';
const ALLOWED_WEB_ORIGINS = new Set([
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const SUPPORTED_LANGUAGES = new Set(['cpp', 'java', 'python', 'javascript', 'typescript', 'csharp', 'go', 'rust']);

const profileSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: PROFILE_KEY },
    name: { type: String, default: '' },
    leetcodeId: { type: String, default: '' },
    codeforcesId: { type: String, default: '' },
    avatar: { type: String, default: '' },
    defaultQuestionView: { type: String, enum: ['practice', 'solution'], default: 'practice' },
  },
  { timestamps: true }
);

const Profile = mongoose.model('Profile', profileSchema);

const noteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    platform: { type: String, required: true },
    link: { type: String, default: '' },
    difficulty: { type: String, required: true },
    tags: { type: [String], default: [] },
    groups: { type: [String], default: [] },
    problemStatement: { type: String, default: '' },
    notes: { type: String, default: '' },
    approach: { type: String, default: '' },
    mistakes: { type: String, default: '' },
    code: { type: String, default: '' },
    language: { type: String, default: 'cpp' },
    solutions: {
      type: [
        {
          id: { type: String, required: true },
          title: { type: String, default: '' },
          notes: { type: String, default: '' },
          code: { type: String, default: '' },
          language: { type: String, default: 'cpp' },
          isPinned: { type: Boolean, default: false },
          createdAt: { type: String, required: true },
          updatedAt: { type: String, required: true },
        },
      ],
      default: [],
    },
    isPinned: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    confidence: { type: Number, required: true },
    revisionInterval: { type: Number, required: true },
    nextRevisionDate: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false }
);

const Note = mongoose.model('Note', noteSchema);

const app = express();

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_WEB_ORIGINS.has(origin)) return true;
  if (origin.startsWith('chrome-extension://')) return true;
  if (origin.startsWith('moz-extension://')) return true;
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin || 'unknown'}`));
    },
  })
);
app.use(express.json({ limit: '6mb' }));

function toProfileResponse(profile) {
  if (!profile) {
    return {
      name: '',
      leetcodeId: '',
      codeforcesId: '',
      avatar: '',
      defaultQuestionView: 'practice',
      updatedAt: null,
    };
  }

  return {
    name: profile.name || '',
    leetcodeId: profile.leetcodeId || '',
    codeforcesId: profile.codeforcesId || '',
    avatar: profile.avatar || '',
    defaultQuestionView: profile.defaultQuestionView === 'solution' ? 'solution' : 'practice',
    updatedAt: profile.updatedAt || null,
  };
}

function sanitizeProfilePayload(payload = {}) {
  const trimText = value => (typeof value === 'string' ? value.trim() : '');

  return {
    name: trimText(payload.name),
    leetcodeId: trimText(payload.leetcodeId),
    codeforcesId: trimText(payload.codeforcesId),
    avatar: typeof payload.avatar === 'string' ? payload.avatar : '',
    defaultQuestionView: payload.defaultQuestionView === 'solution' ? 'solution' : 'practice',
  };
}

function sanitizeNotePayload(payload = {}) {
  const note = { ...payload };
  delete note._id;
  delete note.__v;
  if (Array.isArray(note.solutions)) {
    note.solutions = note.solutions.map(solution => {
      const next = { ...solution };
      delete next._id;
      return next;
    });
  }
  return note;
}

function toText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createEntityId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeStringList(value) {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set();
  const normalized = [];

  list.forEach(item => {
    const next = toText(item);
    if (!next) return;
    const key = next.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(next);
  });

  return normalized;
}

function normalizeDifficulty(value) {
  const raw = toText(value).toLowerCase();
  if (!raw) return 'Medium';
  if (raw.includes('easy')) return 'Easy';
  if (raw.includes('medium')) return 'Medium';
  if (raw.includes('hard')) return 'Hard';

  const rating = Number(raw.replace(/[^\d]/g, ''));
  if (Number.isFinite(rating) && rating > 0) {
    if (rating <= 1200) return 'Easy';
    if (rating <= 1800) return 'Medium';
    return 'Hard';
  }

  return 'Medium';
}

function normalizeLanguage(value) {
  const raw = toText(value).toLowerCase();
  if (!raw) return 'cpp';

  const aliases = {
    'c++': 'cpp',
    cpp: 'cpp',
    c: 'cpp',
    java: 'java',
    py: 'python',
    python: 'python',
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    'c#': 'csharp',
    csharp: 'csharp',
    cs: 'csharp',
    golang: 'go',
    go: 'go',
    rust: 'rust',
  };

  const normalized = aliases[raw] || raw;
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : 'cpp';
}

function detectPlatformFromLink(link) {
  const lower = toText(link).toLowerCase();
  if (!lower) return 'Other';
  if (lower.includes('leetcode.com')) return 'LeetCode';
  if (lower.includes('codeforces.com')) return 'Codeforces';
  if (lower.includes('geeksforgeeks.org')) return 'GFG';
  if (lower.includes('codingninjas.com') || lower.includes('naukri.com')) return 'Code360';
  if (lower.includes('hackerrank.com')) return 'HackerRank';
  if (lower.includes('codechef.com')) return 'CodeChef';
  if (lower.includes('atcoder.jp')) return 'AtCoder';
  return 'Other';
}

function normalizePlatform(value, link) {
  const input = toText(value);
  if (!input) return detectPlatformFromLink(link);

  const lowered = input.toLowerCase();
  if (lowered === 'leetcode') return 'LeetCode';
  if (lowered === 'codeforces') return 'Codeforces';
  if (lowered === 'gfg' || lowered.includes('geeks')) return 'GFG';
  if (lowered.includes('code360') || lowered.includes('codingninjas') || lowered.includes('naukri')) return 'Code360';
  if (lowered.includes('hackerrank')) return 'HackerRank';
  if (lowered.includes('codechef')) return 'CodeChef';
  if (lowered.includes('atcoder')) return 'AtCoder';
  if (lowered === 'other') return 'Other';
  return input;
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

function buildImportedNote(payload = {}) {
  const now = new Date().toISOString();
  const confidence = clamp(Math.round(asNumber(payload.confidence) ?? 3), 1, 5);
  const revisionInterval = computeRevisionInterval(confidence);
  const link = toText(payload.link);
  const language = normalizeLanguage(payload.language);
  const approachName = toText(payload.approachName) || 'Approach 1';
  const approachNotes = toText(payload.approachNotes || payload.approach);
  const code = typeof payload.code === 'string' ? payload.code : '';
  const solutionId = createEntityId();

  return sanitizeNotePayload({
    id: toText(payload.id) || createEntityId(),
    title: toText(payload.title) || 'Untitled Problem',
    platform: normalizePlatform(payload.platform, link),
    link,
    difficulty: normalizeDifficulty(payload.difficulty),
    tags: normalizeStringList(payload.tags),
    groups: normalizeStringList(payload.groups),
    problemStatement: typeof payload.problemStatement === 'string' ? payload.problemStatement : '',
    notes: '',
    approach: approachNotes,
    mistakes: toText(payload.mistakes),
    code,
    language,
    solutions: [
      {
        id: solutionId,
        title: approachName,
        notes: approachNotes,
        code,
        language,
        isPinned: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    isPinned: Boolean(payload.isPinned),
    isFavorite: Boolean(payload.isFavorite),
    confidence,
    revisionInterval,
    nextRevisionDate: getNextRevisionDate(revisionInterval),
    createdAt: now,
    updatedAt: now,
  });
}

function toNoteResponse(note) {
  if (!note) return null;
  const { _id, ...rest } = note;
  if (Array.isArray(rest.solutions)) {
    rest.solutions = rest.solutions.map(solution => {
      const { _id: solutionId, ...solutionRest } = solution;
      return solutionRest;
    });
  }
  return rest;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function asNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }

  return null;
}

function parseDifficultyCountsFromStats(stats) {
  if (!Array.isArray(stats)) {
    return {
      easy: null,
      medium: null,
      hard: null,
      all: null,
    };
  }

  const getCount = difficulty =>
    asNumber(stats.find(item => item?.difficulty?.toLowerCase() === difficulty)?.count);

  return {
    easy: getCount('easy'),
    medium: getCount('medium'),
    hard: getCount('hard'),
    all: getCount('all'),
  };
}

function parseLeetCodeFallbackPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const nestedStats =
    payload.submitStats?.acSubmissionNum ??
    payload.submitStatsGlobal?.acSubmissionNum ??
    payload.matchedUser?.submitStatsGlobal?.acSubmissionNum ??
    [];
  const counts = parseDifficultyCountsFromStats(nestedStats);
  const easy = asNumber(pickFirst(payload.easySolved, payload.problemsSolved?.easy, counts.easy));
  const medium = asNumber(pickFirst(payload.mediumSolved, payload.problemsSolved?.medium, counts.medium));
  const hard = asNumber(pickFirst(payload.hardSolved, payload.problemsSolved?.hard, counts.hard));
  const solvedFromParts = [easy, medium, hard].every(value => value !== null) ? easy + medium + hard : null;

  return {
    rating: asNumber(
      pickFirst(
        payload.rating,
        payload.contestRating,
        payload.userContestRanking?.rating,
        payload.rankingData?.rating,
        payload.userContest?.rating
      )
    ),
    rank: pickFirst(
      payload.rank?.toString?.(),
      payload.ranking?.toString?.(),
      payload.contestGlobalRanking?.toString?.(),
      payload.userContestRanking?.globalRanking?.toString?.(),
      payload.profile?.ranking?.toString?.()
    ),
    solved: asNumber(
      pickFirst(
        payload.totalSolved,
        payload.solvedProblem,
        payload.submitStats?.acSubmissionNum?.find?.(item => item?.difficulty?.toLowerCase() === 'all')?.count,
        counts.all,
        solvedFromParts
      )
    ),
    difficultyCounts: {
      easy,
      medium,
      hard,
    },
  };
}

async function loadLeetCodeRating(handle) {
  if (!handle) {
    return {
      rating: null,
      rank: null,
      solved: null,
      difficultyCounts: { easy: null, medium: null, hard: null },
    };
  }

  const query = `
    query userContestRankingInfo($username: String!) {
      userContestRanking(username: $username) {
        rating
        globalRanking
      }
      userContestRankingHistory(username: $username) {
        attended
        rating
        ranking
      }
      matchedUser(username: $username) {
        profile {
          ranking
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  let graphResult = null;
  try {
    const payload = await fetchJsonWithTimeout(
      'https://leetcode.com/graphql',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          referer: 'https://leetcode.com',
          origin: 'https://leetcode.com',
        },
        body: JSON.stringify({
          query,
          variables: { username: handle },
        }),
      },
      12000
    );

    const data = payload?.data;
    if (data?.matchedUser) {
      const history = Array.isArray(data.userContestRankingHistory) ? data.userContestRankingHistory : [];
      const latestAttended = [...history]
        .reverse()
        .find(entry => entry?.attended && (asNumber(entry?.rating) !== null || asNumber(entry?.ranking) !== null));
      const counts = parseDifficultyCountsFromStats(data.matchedUser.submitStatsGlobal?.acSubmissionNum);
      const solvedFromParts = [counts.easy, counts.medium, counts.hard].every(value => value !== null)
        ? counts.easy + counts.medium + counts.hard
        : null;

      graphResult = {
        rating: asNumber(pickFirst(data.userContestRanking?.rating, latestAttended?.rating)),
        rank: pickFirst(
          data.userContestRanking?.globalRanking?.toString?.(),
          latestAttended?.ranking?.toString?.(),
          data.matchedUser?.profile?.ranking?.toString?.()
        ),
        solved: asNumber(pickFirst(counts.all, solvedFromParts)),
        difficultyCounts: {
          easy: counts.easy,
          medium: counts.medium,
          hard: counts.hard,
        },
      };
    }
  } catch {
    // GraphQL can intermittently fail; fallback sources are attempted below.
  }

  const encodedHandle = encodeURIComponent(handle);
  const fallbackUrls = [
    `https://leetcode-api-pied.vercel.app/user/${encodedHandle}`,
    `https://alfa-leetcode-api.onrender.com/${encodedHandle}`,
    `https://alfa-leetcode-api.onrender.com/${encodedHandle}/contest`,
  ];

  let fallbackResult = null;
  for (const url of fallbackUrls) {
    try {
      const payload = await fetchJsonWithTimeout(url, {}, 9000);
      const parsed = parseLeetCodeFallbackPayload(payload);
      if (!parsed) continue;
      fallbackResult = {
        rating: fallbackResult?.rating ?? parsed.rating,
        rank: fallbackResult?.rank ?? parsed.rank,
        solved: fallbackResult?.solved ?? parsed.solved,
        difficultyCounts: {
          easy: fallbackResult?.difficultyCounts?.easy ?? parsed.difficultyCounts.easy,
          medium: fallbackResult?.difficultyCounts?.medium ?? parsed.difficultyCounts.medium,
          hard: fallbackResult?.difficultyCounts?.hard ?? parsed.difficultyCounts.hard,
        },
      };
    } catch {
      // Ignore per-endpoint failures and keep trying.
    }
  }

  const merged = {
    rating: graphResult?.rating ?? fallbackResult?.rating ?? null,
    rank: graphResult?.rank ?? fallbackResult?.rank ?? null,
    solved: graphResult?.solved ?? fallbackResult?.solved ?? null,
    difficultyCounts: {
      easy: graphResult?.difficultyCounts?.easy ?? fallbackResult?.difficultyCounts?.easy ?? null,
      medium: graphResult?.difficultyCounts?.medium ?? fallbackResult?.difficultyCounts?.medium ?? null,
      hard: graphResult?.difficultyCounts?.hard ?? fallbackResult?.difficultyCounts?.hard ?? null,
    },
  };

  if (merged.solved === null) {
    const { easy, medium, hard } = merged.difficultyCounts;
    if ([easy, medium, hard].every(value => value !== null)) {
      merged.solved = easy + medium + hard;
    }
  }

  if (
    merged.rating === null &&
    merged.rank === null &&
    merged.solved === null &&
    merged.difficultyCounts.easy === null &&
    merged.difficultyCounts.medium === null &&
    merged.difficultyCounts.hard === null
  ) {
    throw new Error('LeetCode profile unavailable');
  }

  return merged;
}

async function loadCodeforcesRating(handle) {
  if (!handle) {
    return { rating: null, maxRating: null, rank: null };
  }

  const encodedHandle = encodeURIComponent(handle);
  const payload = await fetchJsonWithTimeout(`https://codeforces.com/api/user.info?handles=${encodedHandle}`);

  if (payload.status !== 'OK' || !Array.isArray(payload.result) || payload.result.length === 0) {
    throw new Error('Codeforces profile not found');
  }

  const user = payload.result[0];
  return {
    rating: asNumber(user.rating),
    maxRating: asNumber(user.maxRating),
    rank: typeof user.rank === 'string' ? user.rank : null,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/profile', async (_req, res) => {
  try {
    const profile = await Profile.findOne({ key: PROFILE_KEY }).lean();
    res.json(toProfileResponse(profile));
  } catch (error) {
    res.status(500).json({ message: 'Failed to load profile', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/notes', async (_req, res) => {
  try {
    const notes = await Note.find().sort({ updatedAt: -1 }).lean();
    res.json(notes.map(toNoteResponse));
  } catch (error) {
    res.status(500).json({ message: 'Failed to load notes', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const payload = sanitizeNotePayload(req.body);

    if (!payload || typeof payload.id !== 'string') {
      return res.status(400).json({ message: 'Invalid note payload' });
    }

    const saved = await Note.findOneAndUpdate({ id: payload.id }, payload, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      overwriteDiscriminatorKey: true,
      lean: true,
    });

    res.status(201).json(toNoteResponse(saved));
  } catch (error) {
    res.status(500).json({ message: 'Failed to save note', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/notes/import', async (req, res) => {
  try {
    const payload = buildImportedNote(req.body);

    const saved = await Note.findOneAndUpdate({ id: payload.id }, payload, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      overwriteDiscriminatorKey: true,
      lean: true,
    });

    res.status(201).json(toNoteResponse(saved));
  } catch (error) {
    res.status(500).json({ message: 'Failed to import note', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...sanitizeNotePayload(req.body), id };
    const updated = await Note.findOneAndUpdate({ id }, updates, { new: true, lean: true });

    if (!updated) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(toNoteResponse(updated));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update note', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Note.findOneAndDelete({ id });

    if (!deleted) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json({ status: 'deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete note', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    const updates = sanitizeProfilePayload(req.body);
    const profile = await Profile.findOneAndUpdate(
      { key: PROFILE_KEY },
      { ...updates, key: PROFILE_KEY },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json(toProfileResponse(profile));
  } catch (error) {
    res.status(500).json({ message: 'Failed to save profile', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/ratings', async (req, res) => {
  const leetcodeId = typeof req.query.leetcodeId === 'string' ? req.query.leetcodeId.trim() : '';
  const codeforcesId = typeof req.query.codeforcesId === 'string' ? req.query.codeforcesId.trim() : '';

  const result = {
    leetcode: {
      rating: null,
      rank: null,
      solved: null,
      difficultyCounts: {
        easy: null,
        medium: null,
        hard: null,
      },
      error: undefined,
    },
    codeforces: {
      rating: null,
      maxRating: null,
      rank: null,
      error: undefined,
    },
    fetchedAt: new Date().toISOString(),
  };

  if (!leetcodeId && !codeforcesId) {
    return res.status(400).json({ message: 'At least one handle is required' });
  }

  if (leetcodeId) {
    try {
      const leetcode = await loadLeetCodeRating(leetcodeId);
      result.leetcode = { ...result.leetcode, ...leetcode };
    } catch (error) {
      result.leetcode.error = error instanceof Error ? error.message : 'Failed to load LeetCode rating';
    }
  }

  if (codeforcesId) {
    try {
      const codeforces = await loadCodeforcesRating(codeforcesId);
      result.codeforces = { ...result.codeforces, ...codeforces };
    } catch (error) {
      result.codeforces.error = error instanceof Error ? error.message : 'Failed to load Codeforces rating';
    }
  }

  res.json(result);
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB connected at ${MONGODB_URI}`);

    app.listen(PORT, () => {
      console.log(`Recall API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }
}

start();
