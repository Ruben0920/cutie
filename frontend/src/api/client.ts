import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

export const TOKEN_STORAGE_KEY = 'cutie_jwt_token';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
}

export function getWebSocketUrl(token: string): string {
  const apiUrl = getApiBaseUrl().replace(/\/+$/, '');
  const wsBase = apiUrl.startsWith('https://')
    ? apiUrl.replace(/^https:\/\//, 'wss://')
    : apiUrl.replace(/^http:\/\//, 'ws://');
  return `${wsBase}/ws/${encodeURIComponent(token)}`;
}

interface AuthBridge {
  getToken: () => string | null;
  onUnauthorized: () => Promise<void> | void;
}

let authBridge: AuthBridge = {
  getToken: () => null,
  onUnauthorized: () => undefined,
};

export function registerAuthBridge(bridge: AuthBridge): void {
  authBridge = bridge;
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token = authBridge.getToken();
    if (!token) {
      try {
        token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      } catch {
        token = null;
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = error.config?.url ?? '';
      const isAuthEndpoint =
        url.includes('/auth/login') || url.includes('/auth/register');
      if (!isAuthEndpoint) {
        await authBridge.onUnauthorized();
      }
    }
    return Promise.reject(error);
  },
);
