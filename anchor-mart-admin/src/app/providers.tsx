import { Provider } from "react-redux";
import { store } from "@/store";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Global providers wrapper.
 * Wraps the entire app with Redux store and Sonner toast provider.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            fontFamily: "var(--font-body)",
            fontSize: "13.5px",
            fontWeight: 600,
          },
        }}
      />
    </Provider>
  );
}
