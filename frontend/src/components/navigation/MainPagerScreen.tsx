import * as Haptics from 'expo-haptics';
import { CalendarHeart, Dices, Heart, Sparkles, User } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CategoriesGridPage,
  CategoryIdeasPage,
} from '@/components/ideas/DateIdeasView';
import {
  WishlistFoldersPage,
  WishlistItemsPage,
} from '@/components/ideas/GiftsWishlistView';
import CycleScreen from '@/screens/CycleScreen';
import DiceScreen from '@/screens/DiceScreen';
import HomeScreen from '@/screens/HomeScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import { MainTabKey, PagerPageKey, useNavStore } from '@/store/useNavStore';
import { colors } from '@/theme/colors';

interface PagerPageDescriptor {
  key: PagerPageKey;
  tab: MainTabKey;
}

const TAB_ITEMS: Array<{ key: MainTabKey; labelKey: string }> = [
  { key: 'home', labelKey: 'tabs.home' },
  { key: 'ideas', labelKey: 'tabs.ideas' },
  { key: 'dice', labelKey: 'tabs.dice' },
  { key: 'cycle', labelKey: 'tabs.cycle' },
  { key: 'profile', labelKey: 'tabs.profile' },
];

function renderTabIcon(
  tab: MainTabKey,
  color: string,
  size: number,
): React.JSX.Element {
  switch (tab) {
    case 'home':
      return <Heart color={color} size={size} />;
    case 'ideas':
      return <Sparkles color={color} size={size} />;
    case 'dice':
      return <Dices color={color} size={size} />;
    case 'cycle':
      return <CalendarHeart color={color} size={size} />;
    case 'profile':
      return <User color={color} size={size} />;
  }
}

export function MainPagerScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);

  const activeCategory = useNavStore((s) => s.activeCategory);
  const wishlistFolder = useNavStore((s) => s.wishlistFolder);
  const currentPageKey = useNavStore((s) => s.currentPageKey);
  const scrollTarget = useNavStore((s) => s.scrollTarget);
  const setCurrentPageKey = useNavStore((s) => s.setCurrentPageKey);
  const requestTab = useNavStore((s) => s.requestTab);

  const pages: PagerPageDescriptor[] = useMemo(() => {
    const list: PagerPageDescriptor[] = [
      { key: 'home', tab: 'home' },
      { key: 'categories', tab: 'ideas' },
    ];

    if (activeCategory?.kind === 'wishlist') {
      list.push({ key: 'wishlist-folders', tab: 'ideas' });
      if (wishlistFolder !== null) {
        list.push({ key: 'wishlist-items', tab: 'ideas' });
      }
    } else if (activeCategory !== null) {
      list.push({ key: 'category-ideas', tab: 'ideas' });
    }

    list.push(
      { key: 'dice', tab: 'dice' },
      { key: 'cycle', tab: 'cycle' },
      { key: 'profile', tab: 'profile' },
    );
    return list;
  }, [activeCategory, wishlistFolder]);

  const [liveTab, setLiveTab] = useState<MainTabKey>('home');

  useEffect(() => {
    const found = pages.find((p) => p.key === currentPageKey);
    if (found) {
      setLiveTab(found.tab);
    }
  }, [pages, currentPageKey]);

  useEffect(() => {
    if (!scrollTarget || width <= 0) return;
    const targetIdx = pages.findIndex((p) => p.key === scrollTarget.key);
    if (targetIdx === -1) return;

    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        x: targetIdx * width,
        animated: scrollTarget.animated,
      });
      setCurrentPageKey(pages[targetIdx].key);
      setLiveTab(pages[targetIdx].tab);
    });

    return () => cancelAnimationFrame(frame);
  }, [scrollTarget, pages, width, setCurrentPageKey]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (width <= 0) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.max(
      0,
      Math.min(pages.length - 1, Math.round(offsetX / width)),
    );
    const hoveredPage = pages[idx];
    if (hoveredPage && hoveredPage.tab !== liveTab) {
      setLiveTab(hoveredPage.tab);
    }
  };

  const handleMomentumEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    if (width <= 0) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.max(
      0,
      Math.min(pages.length - 1, Math.round(offsetX / width)),
    );
    const landedPage = pages[idx];
    if (landedPage) {
      setCurrentPageKey(landedPage.key);
      setLiveTab(landedPage.tab);
    }
  };

  const renderPageContent = (key: PagerPageKey): React.JSX.Element => {
    switch (key) {
      case 'home':
        return <HomeScreen />;
      case 'categories':
        return <CategoriesGridPage />;
      case 'category-ideas':
        return <CategoryIdeasPage />;
      case 'wishlist-folders':
        return <WishlistFoldersPage />;
      case 'wishlist-items':
        return <WishlistItemsPage />;
      case 'dice':
        return <DiceScreen />;
      case 'cycle':
        return <CycleScreen />;
      case 'profile':
        return <ProfileScreen />;
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.pager}
      >
        {pages.map((page) => (
          <View key={page.key} style={[styles.page, { width }]}>
            {renderPageContent(page.key)}
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.tabBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {TAB_ITEMS.map((item) => {
          const active = liveTab === item.key;
          const color = active ? colors.primary : colors.textMuted;
          return (
            <Pressable
              key={item.key}
              accessibilityLabel={t(item.labelKey)}
              style={styles.tabItem}
              onPress={() => {
                void Haptics.selectionAsync();
                requestTab(item.key, true);
              }}
            >
              {renderTabIcon(item.key, color, 24)}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
});
