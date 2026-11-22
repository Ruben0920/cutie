import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateIdeasView } from '@/components/ideas/DateIdeasView';
import { GiftsWishlistView } from '@/components/ideas/GiftsWishlistView';
import { colors, radii, spacing } from '@/theme/colors';

type IdeasSegment = 'dates' | 'gifts';

export default function IdeasScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<IdeasSegment>('dates');

  return (
    <View style={styles.canvas}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tabs.ideas')}</Text>
        <Text style={styles.subtitle}>{t('ideas.tapToOpen')}</Text>
      </View>

      <View style={styles.switcher}>
        <Pressable
          style={[
            styles.segmentBtn,
            segment === 'dates' && styles.segmentBtnActive,
          ]}
          onPress={() => setSegment('dates')}
        >
          <Text
            style={[
              styles.segmentText,
              segment === 'dates' && styles.segmentTextActive,
            ]}
          >
            {t('ideas.datesTab')}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentBtn,
            segment === 'gifts' && styles.segmentBtnActive,
          ]}
          onPress={() => setSegment('gifts')}
        >
          <Text
            style={[
              styles.segmentText,
              segment === 'gifts' && styles.segmentTextActive,
            ]}
          >
            {t('ideas.giftsTab')}
          </Text>
        </Pressable>
      </View>

      {segment === 'dates' ? <DateIdeasView /> : <GiftsWishlistView />}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#F6F4F8',
    paddingHorizontal: spacing.lg,
    paddingTop: 58,
    gap: spacing.md,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: '#EAE6EE',
    borderRadius: radii.md,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.sm + 2,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
