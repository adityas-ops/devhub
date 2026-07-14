import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import api from '../utils/api';
import type {
  SearchReposResponse,
  SearchUsersResponse,
  SearchTopicsResponse,
  SearchQueryParams,
} from '../types/search';

// ─── Axios-backed base query for RTK Query ───
const axiosBaseQuery: BaseQueryFn<
  {
    url: string;
    params?: Record<string, any>;
    headers?: Record<string, string>;
  },
  unknown,
  { status?: number; message: string }
> = async ({ url, params, headers }) => {
  try {
    const result = await api.get(url, { params, headers });
    return { data: result };
  } catch (error: any) {
    return {
      error: {
        status: error.status,
        message: error.message || 'An error occurred',
      },
    };
  }
};

// ─── Search API Slice ───
export const searchApi = createApi({
  reducerPath: 'searchApi',
  baseQuery: axiosBaseQuery,
  endpoints: builder => ({
    // ── Search Repositories ──
    searchRepos: builder.query<SearchReposResponse, SearchQueryParams>({
      query: ({ q, sort, order, per_page = 20, page = 1, language }) => {
        // Build the full query string with optional language filter
        let fullQuery = q;
        if (language && language !== 'All') {
          fullQuery += `+language:${language}`;
        }

        return {
          url: '/search/repositories',
          params: {
            q: fullQuery,
            sort: sort || undefined,
            order: order || undefined,
            per_page,
            page,
          },
        };
      },
      // Serialize only by q + sort + language so page changes don't create new cache entries
      serializeQueryArgs: ({ queryArgs }) => {
        return `repos-${queryArgs.q}-${queryArgs.sort || ''}-${queryArgs.language || ''}`;
      },
      // Merge new page results into existing items
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) {
          return newItems;
        }
        currentCache.items.push(...newItems.items);
        currentCache.total_count = newItems.total_count;
        currentCache.incomplete_results = newItems.incomplete_results;
      },
      // Force refetch when page changes
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg !== previousArg;
      },
    }),

    // ── Search Users ──
    searchUsers: builder.query<SearchUsersResponse, SearchQueryParams>({
      query: ({ q, per_page = 20, page = 1 }) => ({
        url: '/search/users',
        params: {
          q: `${q}+type:user`,
          per_page,
          page,
        },
      }),
      serializeQueryArgs: ({ queryArgs }) => {
        return `users-${queryArgs.q}`;
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) {
          return newItems;
        }
        currentCache.items.push(...newItems.items);
        currentCache.total_count = newItems.total_count;
        currentCache.incomplete_results = newItems.incomplete_results;
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg !== previousArg;
      },
    }),

    // ── Search Topics ──
    searchTopics: builder.query<SearchTopicsResponse, SearchQueryParams>({
      query: ({ q, per_page = 20, page = 1 }) => ({
        url: '/search/topics',
        params: {
          q,
          per_page,
          page,
        },
        headers: {
          Accept: 'application/vnd.github.mercy-preview+json',
        },
      }),
      serializeQueryArgs: ({ queryArgs }) => {
        return `topics-${queryArgs.q}`;
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) {
          return newItems;
        }
        currentCache.items.push(...newItems.items);
        currentCache.total_count = newItems.total_count;
        currentCache.incomplete_results = newItems.incomplete_results;
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg !== previousArg;
      },
    }),
  }),
});

export const {
  useSearchReposQuery,
  useSearchUsersQuery,
  useSearchTopicsQuery,
} = searchApi;
