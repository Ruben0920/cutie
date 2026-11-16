import { Tabs } from 'expo-router';
import { CalendarHeart, Dices, Heart, Sparkles, User } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/colors';

export default function TabsLayout(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ideas"
        options={{
          title: t('tabs.ideas'),
          tabBarIcon: ({ color, size }) => (
            <Sparkles color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dice"
        options={{
          title: t('tabs.dice'),
          tabBarIcon: ({ color, size }) => <Dices color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cycle"
        options={{
          title: t('tabs.cycle'),
          tabBarIcon: ({ color, size }) => (
            <CalendarHeart color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
