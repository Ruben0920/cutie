import { create } from 'zustand';

import type { CustomCategory, DateCategoryEnum } from '@/types/api';

export type MainTabKey = 'home' | 'ideas' | 'dice' | 'cycle' | 'profile';

export type CategorySelection =
  | { kind: 'builtin'; key: DateCategoryEnum }
  | { kind: 'surprises' }
  | { kind: 'wishlist' }
  | { kind: 'custom'; category: CustomCategory }
  | null;

export type WishlistFolderKey = 'partner' | 'mine' | null;

export type PagerPageKey =
  | 'home'
  | 'categories'
  | 'category-ideas'
  | 'wishlist-folders'
  | 'wishlist-items'
  | 'dice'
  | 'cycle'
  | 'profile';

interface NavState {
  currentPageKey: PagerPageKey;
  activeCategory: CategorySelection;
  wishlistFolder: WishlistFolderKey;
  scrollTarget: { key: PagerPageKey; nonce: number; animated: boolean } | null;
  setCurrentPageKey: (key: PagerPageKey) => void;
  openCategory: (selection: Exclude<CategorySelection, null>) => void;
  openWishlistFolder: (folder: Exclude<WishlistFolderKey, null>) => void;
  clearDeletedCustomCategory: (categoryId: string) => void;
  requestPage: (key: PagerPageKey, animated?: boolean) => void;
  requestTab: (tab: MainTabKey, animated?: boolean) => void;
  resetNav: () => void;
}

export const useNavStore = create<NavState>((set, get) => ({
  currentPageKey: 'home',
  activeCategory: null,
  wishlistFolder: null,
  scrollTarget: null,

  setCurrentPageKey: (key: PagerPageKey) => {
    set({ currentPageKey: key });
  },

  openCategory: (selection: Exclude<CategorySelection, null>) => {
    const targetPage: PagerPageKey =
      selection.kind === 'wishlist' ? 'wishlist-folders' : 'category-ideas';
    set((state) => ({
      activeCategory: selection,
      scrollTarget: {
        key: targetPage,
        nonce: (state.scrollTarget?.nonce ?? 0) + 1,
        animated: true,
      },
    }));
  },

  openWishlistFolder: (folder: Exclude<WishlistFolderKey, null>) => {
    set((state) => ({
      wishlistFolder: folder,
      scrollTarget: {
        key: 'wishlist-items',
        nonce: (state.scrollTarget?.nonce ?? 0) + 1,
        animated: true,
      },
    }));
  },

  clearDeletedCustomCategory: (categoryId: string) => {
    const { activeCategory } = get();
    if (
      activeCategory?.kind === 'custom' &&
      activeCategory.category.id === categoryId
    ) {
      set((state) => ({
        activeCategory: null,
        scrollTarget: {
          key: 'categories',
          nonce: (state.scrollTarget?.nonce ?? 0) + 1,
          animated: true,
        },
      }));
    }
  },

  requestPage: (key: PagerPageKey, animated = true) => {
    set((state) => ({
      scrollTarget: {
        key,
        nonce: (state.scrollTarget?.nonce ?? 0) + 1,
        animated,
      },
    }));
  },

  requestTab: (tab: MainTabKey, animated = true) => {
    const keyMap: Record<MainTabKey, PagerPageKey> = {
      home: 'home',
      ideas: 'categories',
      dice: 'dice',
      cycle: 'cycle',
      profile: 'profile',
    };
    get().requestPage(keyMap[tab], animated);
  },

  resetNav: () => {
    set({
      currentPageKey: 'home',
      activeCategory: null,
      wishlistFolder: null,
      scrollTarget: null,
    });
  },
}));
