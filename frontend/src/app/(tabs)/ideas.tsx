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
    <View style={styles.container}>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 58,
    gap: spacing.md,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
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
    color: colors.primary,
    fontWeight: '800',
  },
});
