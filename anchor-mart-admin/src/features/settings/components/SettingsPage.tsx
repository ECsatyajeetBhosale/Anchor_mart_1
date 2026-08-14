import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { PlatformConfigCard } from "./PlatformConfigCard";

/**
 * Platform configuration, and nothing else.
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
      <PlatformConfigCard />
    </div>
  );
}
