export interface UserProfile {
  name: string;
  leetcodeId: string;
  codeforcesId: string;
  avatar: string;
  defaultQuestionView: 'practice' | 'solution';
  updatedAt?: string;
}

export interface PlatformRatings {
  leetcode: {
    rating: number | null;
    rank: string | null;
    solved: number | null;
    difficultyCounts: {
      easy: number | null;
      medium: number | null;
      hard: number | null;
    };
    error?: string;
  };
  codeforces: {
    rating: number | null;
    maxRating: number | null;
    rank: string | null;
    error?: string;
  };
  fetchedAt?: string;
}

export const emptyProfile: UserProfile = {
  name: '',
  leetcodeId: '',
  codeforcesId: '',
  avatar: '',
  defaultQuestionView: 'practice',
};
