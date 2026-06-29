import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { getToken, clearToken } from '../storage/secureStorage';
import Config from 'react-native-config';

// Standard API Error Interface
export interface ApiError {
  status?: number;
  message: string;
  code?: string;
  details?: any;
}

// Request configuration options extending standard AxiosRequestConfig
export interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;       // Set to true to bypass sending authorization headers
  requireRawResponse?: boolean; // Set to true if you need the full AxiosResponse instead of just the data
}

/**
 * Robust, feature-rich Axios API Client class wrapper.
 */
class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    // 1. Initialize instance with sensible defaults
    this.instance = axios.create({
      baseURL: 'https://api.github.com', // Default to Github API, can be overridden per request
      timeout: 15000, // 15 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json', // Default Github Accept header
      },
    });

    // 2. Attach Request Interceptor (dynamic auth injection)
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig & ApiRequestConfig) => {
        // Bypass token injection if skipAuth is explicitly set
        if (!config.skipAuth) {
          try {
            const token = (await getToken()) || Config.GITHUB_TOKEN;
            if (token) {
              config.headers = config.headers || {};
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (error) {
            console.error('Error fetching token for API request:', error);
          }
        }
        return config;
      },
      (error) => Promise.reject(this.normalizeError(error))
    );

    // 3. Attach Response Interceptor (success data unwrapping & error handling)
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Return raw response if configured, otherwise unwrap data
        const config = response.config as ApiRequestConfig;
        if (config.requireRawResponse) {
          return response;
        }
        return response.data;
      },
      async (error) => {
        const normalized = this.normalizeError(error);

        // Global token expiration check (GitHub or API returns 401 Unauthorized)
        if (normalized.status === 401) {
          console.warn('API returned 401 Unauthorized. Clearing local tokens...');
          try {
            await clearToken();
            // Optional: Dispatch a global logout event or redirect to login screen
          } catch (storageError) {
            console.error('Failed to clear expired token:', storageError);
          }
        }

        return Promise.reject(normalized);
      }
    );
  }

  /**
   * Normalizes different error sources (network, server, browser/runtime) into a consistent ApiError format.
   */
  private normalizeError(error: any): ApiError {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The server responded with a status code out of the 2xx range
        const data = error.response.data;
        const message =
          data?.message ||
          data?.error_description ||
          error.message ||
          'A server error occurred';

        return {
          status: error.response.status,
          message,
          code: data?.code || 'SERVER_ERROR',
          details: data,
        };
      } else if (error.request) {
        // The request was made but no response was received
        return {
          message: 'No response received from server. Please check your network connection.',
          code: 'NETWORK_ERROR',
          details: error.request,
        };
      }
    }

    // Generic or Javascript runtime error
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      details: error,
    };
  }

  /**
   * Generic request dispatcher
   */
  public async request<T = any>(config: ApiRequestConfig): Promise<T> {
    return this.instance.request<any, T>(config);
  }

  /**
   * GET Request
   */
  public async get<T = any>(
    url: string,
    config?: ApiRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * POST Request
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: ApiRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * PUT Request
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: ApiRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * PATCH Request
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: ApiRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * DELETE Request
   */
  public async delete<T = any>(
    url: string,
    config?: ApiRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Multipart/Form-Data Post (e.g. for uploading files/images)
   */
  public async upload<T = any>(
    url: string,
    formData: FormData,
    config?: ApiRequestConfig
  ): Promise<T> {
    return this.post<T>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Create an AbortController for request cancellation.
   * Usage:
   *   const controller = api.createAbortController();
   *   api.get('/endpoint', { signal: controller.signal });
   *   controller.abort();
   */
  public createAbortController(): AbortController {
    return new AbortController();
  }

  /**
   * Dynamically update the default baseURL for the API client
   */
  public setBaseURL(url: string): void {
    this.instance.defaults.baseURL = url;
  }
}

// Export a single instance to be used across the application
export const api = new ApiClient();

export default api;
