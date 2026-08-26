import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { OrderConfigCard } from "./OrderConfigCard";

/**
 * Order configuration, and nothing else.
 *
 * The card here used to be "Platform Configuration": four hardcoded strings,
 * each labelled "No API — not saved". Two of those values — the cancellation
 * window and the delivery timings — now have a real endpoint and are edited
 * here. The payment timeout, the description cap and the feature toggles had no
 * endpoint then and still have none, so they are gone rather than shown as
 * facts nobody can verify or change.
 *
 * Two shortcut cards used to sit beside it — Account Management and Help & FAQ.
 * Both are sidebar entries in their own right now (Account Management is a whole
 * section; Help & FAQ sits under System), so the cards were a second door to a
 * room already on the map. The Accounts one had also gone stale: it pointed at
 * `/account-management`, which is now only a redirect.
 */
export function SettingsPage() {
  return (
    <div>
      <PageHeader title={MESSAGES.SETTINGS.TITLE} />
      <OrderConfigCard />
    </div>
  );
}
