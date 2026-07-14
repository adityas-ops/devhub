// ─── GitHub Search API Response Types ───

// ── Repositories ──
export interface SearchRepoItem {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  html_url: string;
  topics?: string[];
}

export interface SearchReposResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchRepoItem[];
}

// ── Users ──
export interface SearchUserItem {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  type: string; // 'User' | 'Organization'
  score: number;
}

export interface SearchUsersResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchUserItem[];
}

// ── Topics ──
export interface SearchTopicItem {
  name: string;
  display_name: string | null;
  short_description: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  featured: boolean;
  curated: boolean;
  score: number;
}

export interface SearchTopicsResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchTopicItem[];
}

// ── Shared Query Params ──
export interface SearchQueryParams {
  q: string;
  sort?: string;
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
  language?: string;
}
