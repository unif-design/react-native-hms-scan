import { useCallback, useEffect, useReducer, useRef } from 'react';
import { BackHandler } from 'react-native';
import {
  canGoBack,
  navigationReducer,
  type ExampleRoute,
  type NavigationState,
} from '../navigation/exampleNavigation';
import { HomeScreen } from '../screens/HomeScreen';
import { DecodeImageShowcaseScreen } from '../showcases/decode-image/DecodeImageShowcaseScreen';
import { HeadlessShowcaseScreen } from '../showcases/headless/HeadlessShowcaseScreen';
import {
  ScannerShowcaseScreen,
  type ActiveBackHandler,
} from '../showcases/scanner/ScannerShowcaseScreen';

const homeRoute: ExampleRoute = { name: 'home' };
const initialNavigationState: NavigationState = {
  stack: [homeRoute],
};

export function ExampleRouter() {
  const [navigation, dispatch] = useReducer(
    navigationReducer,
    initialNavigationState
  );
  const activeBackHandlerRef = useRef<ActiveBackHandler | null>(null);

  const navigate = useCallback((route: ExampleRoute) => {
    dispatch({ type: 'navigate', route });
  }, []);

  const back = useCallback(() => {
    dispatch({ type: 'back' });
  }, []);

  const handleActiveBackHandlerChange = useCallback(
    (handler: ActiveBackHandler | null) => {
      activeBackHandlerRef.current = handler;
    },
    []
  );

  const handleHardwareBack = useCallback(() => {
    if (activeBackHandlerRef.current?.()) return true;
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
      return (
        <ScannerShowcaseScreen
          onBack={back}
          onActiveBackHandlerChange={handleActiveBackHandlerChange}
        />
      );
    case 'headless':
      return <HeadlessShowcaseScreen onBack={back} />;
    case 'decode-image':
      return <DecodeImageShowcaseScreen onBack={back} />;
  }
}
