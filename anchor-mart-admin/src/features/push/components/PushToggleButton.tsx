import { MESSAGES } from "@/lib/messages";
import { IconBellOff, IconBellPlus, IconBellRinging } from "@tabler/icons-react";
import { usePushNotifications } from "../hooks/usePushNotifications";

const P = MESSAGES.PUSH;

/**
 * Header control for browser push.
 *
 * Renders nothing at all when push is impossible — an unsupported browser, or a
 * build with no Firebase config. A disabled button would be worse than absent:
 * it advertises a capability this deployment does not have and invites a click
 * that can only ever produce an error toast.
 *
 * The enabled state stays visible rather than disappearing once it has done its
 * job, because "am I going to be told about this?" is a question admins ask of a
 * console they leave running, and a control that vanishes on success answers it
 * with silence.
 */
export function PushToggleButton() {
  const { state, enable } = usePushNotifications();

  if (state === "unsupported" || state === "unconfigured") return null;

  const isEnabled = state === "enabled";
  const isDenied = state === "denied";
  const label = isEnabled ? P.ENABLED_LABEL : isDenied ? P.DENIED_LABEL : P.ENABLE;

  return (
    <button
      type="button"
      className="tb-action"
      title={label}
      aria-label={label}
      aria-pressed={isEnabled}
      // Not `disabled` when denied: a disabled control gives no way to find out
      // why it is dead. Clicking explains that the block lives in browser
      // settings, which is the only place it can be lifted.
      onClick={() => void enable()}
    >
      {isEnabled ? (
        <IconBellRinging size={17} />
      ) : isDenied ? (
        <IconBellOff size={17} />
      ) : (
        <IconBellPlus size={17} />
      )}
    </button>
  );
}

export default PushToggleButton;
