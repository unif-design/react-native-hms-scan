import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Icon, ThemeProvider } from '@unif/react-native-design';
import { ScanToolbar } from '../Scanner/ScanToolbar';

test('pressing a toolbar action fades its icon without fading the native material ancestry', () => {
  jest.useFakeTimers();
  try {
    const onFlash = jest.fn();
    render(
      <ThemeProvider forceScheme="dark">
        <ScanToolbar flash={false} bottomInset={0} onFlash={onFlash} />
      </ThemeProvider>
    );
    const button = screen.getByRole('button', { name: '手电筒' });
    const touch = {
      persist: () => {},
      currentTarget: { measure: () => {} },
      nativeEvent: { pageX: 0, pageY: 0, locationX: 0, locationY: 0 },
    };
    fireEvent(button, 'responderGrant', touch);
    let ancestor = screen.getByTestId('scan-toolbar-glass', {
      includeHiddenElements: true,
    });
    while (ancestor) {
      if (typeof ancestor.type === 'string') {
        expect(StyleSheet.flatten(ancestor.props.style)?.opacity ?? 1).toBe(1);
      }
      if (!ancestor.parent) break;
      ancestor = ancestor.parent;
    }
    expect(
      StyleSheet.flatten(screen.UNSAFE_getByType(Icon).props.style)
    ).toMatchObject({
      opacity: 0.7,
    });
    expect(onFlash).not.toHaveBeenCalled();
    fireEvent(button, 'responderRelease', touch);
    act(() => jest.advanceTimersByTime(150));
    expect(onFlash).toHaveBeenCalledTimes(1);
    expect(
      StyleSheet.flatten(screen.UNSAFE_getByType(Icon).props.style)?.opacity ??
        1
    ).toBe(1);
  } finally {
    jest.useRealTimers();
  }
});
