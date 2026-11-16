import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { registerAuthBridge, TOKEN_STORAGE_KEY } from '@/api/client';
import { authApi } from '@/api/endpoints';
import i18n from '@/i18n';
import type { LanguageEnum, UserProfile } from '@/types/api';

const USER_STORAGE_KEY = 'cutie_user_profile';
const LANGUAGE_STORAGE_KEY = 'cutie_preferred_language';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isHydrated: boolean;
  isWsConnected: boolean;
  language: LanguageEnum;
  setSession: (token: string, user: UserProfile) => Promise<void>;
  updateUser: (partialUser: Partial<UserProfile>) => Promise<void>;
  setLanguage: (lang: LanguageEnum) => Promise<void>;
  setWsConnected: (connected: boolean) => void;
  hydrateFromStorage: () => Promise<void>;
  logout: () => Promise<void>;
}

function isValidLanguage(value: string | null): value is LanguageEnum {
  return value === 'ru' || value === 'en' || value === 'es';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isHydrated: false,
  isWsConnected: false,
  language: 'ru',

  setSession: async (token: string, user: UserProfile) => {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
    await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
    await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, user.preferred_language);
    await i18n.changeLanguage(user.preferred_language);

    set({
      token,
      user,
      language: user.preferred_language,
    });
  },

  updateUser: async (partialUser: Partial<UserProfile>) => {
    const current = get().user;
    if (!current) return;
    const updated: UserProfile = { ...current, ...partialUser };
    await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(updated));
    if (partialUser.preferred_language) {
      await SecureStore.setItemAsync(
        LANGUAGE_STORAGE_KEY,
        partialUser.preferred_language,
      );
      await i18n.changeLanguage(partialUser.preferred_language);
    }
    set({
      user: updated,
      language: updated.preferred_language,
    });
  },

  setLanguage: async (lang: LanguageEnum) => {
    await i18n.changeLanguage(lang);
    await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, lang);
    set({ language: lang });

    const { token, user } = get();
    if (token && user) {
      try {
        const updatedUser = await authApi.updatePreferences({
          preferred_language: lang,
        });
        await SecureStore.setItemAsync(
          USER_STORAGE_KEY,
          JSON.stringify(updatedUser),
        );
        set({ user: updatedUser });
      } catch {
        set({ user: { ...user, preferred_language: lang } });
      }
    }
  },

  setWsConnected: (connected: boolean) => {
    set({ isWsConnected: connected });
  },

  hydrateFromStorage: async () => {
    try {
      const [storedToken, storedUserRaw, storedLang] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_STORAGE_KEY),
        SecureStore.getItemAsync(USER_STORAGE_KEY),
        SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY),
      ]);

      let parsedUser: UserProfile | null = null;
      if (storedUserRaw) {
        try {
          parsedUser = JSON.parse(storedUserRaw) as UserProfile;
        } catch {
          parsedUser = null;
        }
      }

      const resolvedLang: LanguageEnum = isValidLanguage(storedLang)
        ? storedLang
        : parsedUser?.preferred_language ?? 'ru';

      await i18n.changeLanguage(resolvedLang);

      set({
        token: storedToken,
        user: parsedUser,
        language: resolvedLang,
        isHydrated: true,
      });
    } catch {
      set({
        token: null,
        user: null,
        language: 'ru',
        isHydrated: true,
      });
    }
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY),
      SecureStore.deleteItemAsync(USER_STORAGE_KEY),
    ]);
    set({
      token: null,
      user: null,
      isWsConnected: false,
    });
  },
}));

registerAuthBridge({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => useAuthStore.getState().logout(),
});
