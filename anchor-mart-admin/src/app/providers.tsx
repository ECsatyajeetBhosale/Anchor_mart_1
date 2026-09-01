import { store } from "@/store";
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { Toaster } from "sonner";

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
          /**
           * The design system owns the toast, so sonner's own styles are off.
           *
           * That is all-or-nothing: every part it would have styled needs a
           * class here, or it renders with none. The action button is the one
           * that bites — sonner gates its `[data-button]` rule on
           * `[data-styled=true]`, which `unstyled` removes, and the global
           * reset zeroes button padding, so a missing class leaves a
           * browser-default grey box on a dark toast rather than something
           * merely unbranded.
           */
          unstyled: true,
          classNames: {
            toast: "toast",
            success: "success",
            error: "danger",
            warning: "warning",
            info: "info",
            actionButton: "toast-action",
            cancelButton: "toast-action toast-action-ghost",
          },
        }}
      />
    </Provider>
  );
}
