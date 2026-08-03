import { useCallback, useEffect, useReducer } from 'react';
import { BackHandler, StyleSheet, Text } from 'react-native';
import {
  type,
  type ColorTokens,
  useThemedStyles,
} from '@unif/react-native-design';
import {
  canGoBack,
  navigationReducer,
  type ExampleRoute,
  type NavigationState,
} from '../navigation/exampleNavigation';
import { HomeScreen } from '../screens/HomeScreen';
import { ShowcaseScaffold } from '../shared/ShowcaseScaffold';
import { ScannerShowcaseScreen } from '../showcases/scanner/ScannerShowcaseScreen';

const homeRoute: ExampleRoute = { name: 'home' };
const initialNavigationState: NavigationState = {
  stack: [homeRoute],
};

type PlaceholderScreenProps = {
  title: string;
  description: string;
  onBack: () => void;
};

function PlaceholderScreen({
  title,
  description,
  onBack,
}: PlaceholderScreenProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <ShowcaseScaffold title={title} onBack={onBack}>
      <Text style={styles.description}>{description}</Text>
    </ShowcaseScaffold>
  );
}

export function ExampleRouter() {
  const [navigation, dispatch] = useReducer(
    navigationReducer,
    initialNavigationState
  );

  const navigate = useCallback((route: ExampleRoute) => {
    dispatch({ type: 'navigate', route });
  }, []);

  const back = useCallback(() => {
    dispatch({ type: 'back' });
  }, []);

  const handleHardwareBack = useCallback(() => {
    if (!canGoBack(navigation)) return false;

    dispatch({ type: 'back' });
    return true;
  }, [navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack
    );

    return () => subscription.remove();
  }, [handleHardwareBack]);

  const currentRoute =
    navigation.stack[navigation.stack.length - 1] ?? homeRoute;

  switch (currentRoute.name) {
    case 'home':
      return <HomeScreen onNavigate={navigate} />;
    case 'scanner':
      return <ScannerShowcaseScreen onBack={back} />;
    case 'headless':
      return (
        <PlaceholderScreen
          title="HmsScanView 自定义页"
          description="自定义相机叠层、权限与扫描状态将在这里组合。"
          onBack={back}
        />
      );
    case 'decode-image':
      return (
        <PlaceholderScreen
          title="decodeImage 图片识别"
          description="本地图片选择、离线解码与结果状态将在这里组合。"
          onBack={back}
        />
      );
  }
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    description: {
      color: colors.foregroundMuted,
      fontSize: type.sm,
      lineHeight: type.sm * 1.5,
    },
  });
