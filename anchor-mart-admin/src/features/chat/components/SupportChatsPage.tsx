import { ChatMonitorPage, SUPPORT_SOURCES } from "./ChatMonitorPage";

/**
 * The support desk — the "Support" nav entry.
 *
 * Covers **both** support inboxes behind a Sailors / Partners toggle. They were
 * two nav entries until the partner half ("Chat Monitor") was folded in here:
 * that name described neither its audience nor its job, and sitting beside
 * "Support" it read as a duplicate of it. Two endpoints, one desk, one entry.
 */
export function SupportChatsPage() {
  return <ChatMonitorPage source="support" sources={SUPPORT_SOURCES} />;
}

export default SupportChatsPage;
