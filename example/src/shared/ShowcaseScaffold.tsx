import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  NavBar,
  space,
  type ColorTokens,
  useThemedStyles,
} from '@unif/react-native-design';

type ShowcaseScaffoldProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
}>;

export function ShowcaseScaffold({
  title,
  subtitle,
  onBack,
  children,
}: ShowcaseScaffoldProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <NavBar
        title={title}
        subtitle={subtitle}
        left={
          onBack
            ? {
                icon: 'arrow-left',
                onPress: onBack,
                accessibilityLabel: '返回',
              }
            : undefined
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
      padding: space['7'],
      rowGap: space['6'],
    },
  });
