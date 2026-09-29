import { render, screen } from '@testing-library/react-native';
import { ThemeProvider, darkColors } from '@unif/react-native-design';
import { ResultFocus } from '../Scanner/ResultFocus/ResultFocus';
test('raw value and format stay readable in a dark theme', () => {
  render(
    <ThemeProvider forceScheme="dark">
      <ResultFocus
        result={{ value: '001 raw', format: 'EAN_13' }}
        bottomInset={0}
        onRescan={jest.fn()}
        onConfirm={jest.fn()}
      />
    </ThemeProvider>
  );
  expect(screen.getByText('001 raw')).toHaveStyle({
    color: darkColors.foreground,
  });
  expect(screen.getByText('EAN_13')).toHaveStyle({
    color: darkColors.foregroundMuted,
  });
});
