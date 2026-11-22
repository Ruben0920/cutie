import { Smartphone } from 'lucide-react-native';
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
    <View style={styles.wallpaper}>
      <View style={styles.topBezelBar}>
        <View style={styles.dynamicIsland}>
          <Smartphone size={13} color={colors.white} />
          <Text style={styles.islandText}>CutieOS</Text>
        </View>
        <Text style={styles.subtitleHint}>{t('ideas.tapToOpen')}</Text>
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
  wallpaper: {
    flex: 1,
    backgroundColor: '#F7ECF5',
    paddingHorizontal: spacing.lg,
    paddingTop: 52,
    gap: spacing.md,
  },
  topBezelBar: {
    alignItems: 'center',
    gap: 6,
  },
  dynamicIsland: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#19111E',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  islandText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  subtitleHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.68)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
