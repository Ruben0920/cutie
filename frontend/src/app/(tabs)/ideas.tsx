import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DateIdeasView } from '@/components/ideas/DateIdeasView';
import { spacing } from '@/theme/colors';

export default function IdeasScreen(): React.JSX.Element {
  return (
    <View style={styles.canvas}>
      <DateIdeasView />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#F6F4F8',
    paddingHorizontal: spacing.lg,
    paddingTop: 58,
  },
});
