import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

import api from '../utils/api';

import type {
  SearchReposResponse,
  SearchUsersResponse,
  SearchQueryParams,
} from '../types/search';

const axiosBaseQuery: BaseQueryFn<
  {
    url: string;
    params?: Record<string, any>;
    headers?: Record<string, string>;
  },
  unknown,
  {
    status?: number;
    message: string;
  }
> = async ({ url, params, headers }) => {
  try {
    const result = await api.get(url, {
      params,
      headers,
    });

    /*
     * Your existing axios utility appears to return the response data
     * directly because the repository search is already working.
     *
     * Keep this as `result`.
     */
    return {
      data: result,
    };
  } catch (error: any) {
    return {
      error: {
        status: error?.response?.status ?? error?.status,

        message:
          error?.response?.data?.message ??
          error?.message ??
          'An error occurred',
      },
    };
  }
};

export const searchApi = createApi({
  reducerPath: 'searchApi',

  baseQuery: axiosBaseQuery,

  endpoints: builder => ({
    searchRepos: builder.query<SearchReposResponse, SearchQueryParams>({
      query: ({ q, sort, order, per_page = 20, page = 1, language }) => {
        let fullQuery = q.trim();

        /*
         * Language is part of the GitHub repository search query.
         */
        if (language && language !== 'All') {
          fullQuery += `+language:${encodeURIComponent(language)}`;
        }

        return {
          url: '/search/repositories',

          params: {
            q: fullQuery,

            ...(sort
              ? {
                  sort,
                }
              : {}),

            ...(order
              ? {
                  order,
                }
              : {}),

            per_page,
            page,
          },
        };
      },

      /*
       * One cache entry for one repository search/filter combination.
       *
       * Page is intentionally excluded because pages are merged.
       */
      serializeQueryArgs: ({ queryArgs }) => {
        return [
          'repos',
          queryArgs.q,
          queryArgs.sort || '',
          queryArgs.order || '',
          queryArgs.language || 'All',
        ].join('|');
      },

      /*
       * Merge pagination results.
       */
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) {
          return newItems;
        }

        currentCache.items.push(...newItems.items);

        currentCache.total_count = newItems.total_count;

        currentCache.incomplete_results = newItems.incomplete_results;
      },

      /*
       * Refetch whenever search/filter/page changes.
       */
      forceRefetch: ({ currentArg, previousArg }) => {
        if (!currentArg || !previousArg) {
          return true;
        }

        return (
          currentArg.q !== previousArg.q ||
          currentArg.sort !== previousArg.sort ||
          currentArg.order !== previousArg.order ||
          currentArg.language !== previousArg.language ||
          currentArg.page !== previousArg.page
        );
      },
    }),
    searchUsers: builder.query<SearchUsersResponse, SearchQueryParams>({
      query: ({ q, sort, order, per_page = 20, page = 1 }) => {
        return {
          url: '/search/users',

          params: {
            /*
             * IMPORTANT:
             *
             * Do NOT append `+type:user` here.
             *
             * `/search/users` is already the user-search endpoint.
             */
            q: q.trim(),

            ...(sort
              ? {
                  sort,
                }
              : {}),

            ...(order
              ? {
                  order,
                }
              : {}),

            per_page,
            page,
          },
        };
      },

      /*
       * User cache is separated by:
       *
       * search query
       * sort
       * order
       *
       * Page is excluded because pages are merged.
       */
      serializeQueryArgs: ({ queryArgs }) => {
        return [
          'users',
          queryArgs.q,
          queryArgs.sort || '',
          queryArgs.order || '',
        ].join('|');
      },

      /*
       * Merge pagination results.
       */
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) {
          return newItems;
        }

        currentCache.items.push(...newItems.items);

        currentCache.total_count = newItems.total_count;

        currentCache.incomplete_results = newItems.incomplete_results;
      },

      /*
       * Explicitly refetch when any meaningful
       * user-search parameter changes.
       */
      forceRefetch: ({ currentArg, previousArg }) => {
        if (!currentArg || !previousArg) {
          return true;
        }

        return (
          currentArg.q !== previousArg.q ||
          currentArg.sort !== previousArg.sort ||
          currentArg.order !== previousArg.order ||
          currentArg.page !== previousArg.page
        );
      },
    }),
  }),
});

export const { useSearchReposQuery, useSearchUsersQuery } = searchApi;
