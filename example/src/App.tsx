import { AppProviders } from './app/AppProviders';
import { ExampleRouter } from './app/ExampleRouter';

export default function App() {
  return (
    <AppProviders>
      <ExampleRouter />
    </AppProviders>
  );
}
