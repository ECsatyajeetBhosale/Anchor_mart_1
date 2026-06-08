import { Provider } from "react-redux";
import { store } from "@/store";
import { Toaster } from "sonner";
import { IconCheck, IconX, IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
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
        position="bottom-right"
        className="toast-container"
        style={{ bottom: 24, right: 24 }}
        duration={3500}
        icons={{
          success: <IconCheck size={17} />,
          error: <IconX size={17} />,
          warning: <IconAlertTriangle size={17} />,
          info: <IconInfoCircle size={17} />,
        }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: "toast",
            success: "success",
            error: "danger",
            warning: "warning",
            info: "info",
          },
        }}
      />
    </Provider>
  );
}
