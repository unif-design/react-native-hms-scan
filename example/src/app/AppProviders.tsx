import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ThemeProvider,
  ToastHost,
} from '@unif/react-native-design';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={rootStyles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          {children}
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const rootStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
