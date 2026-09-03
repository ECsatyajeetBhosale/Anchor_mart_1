import { Providers } from "@/app/providers";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AppRouter } from "@/routes/AppRouter";

/**
 * The boundary sits **outside** `Providers` on purpose: that way it also covers
 * a throw in the provider tree itself, and its fallback reads nothing from the
 * store — so the screen it shows cannot depend on the state that just broke.
 */
function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  );
}

export default App;
