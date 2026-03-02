import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recall-well';
const PROFILE_KEY = 'default';

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
app.use(
  cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://127.0.0.1:5173'],
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
