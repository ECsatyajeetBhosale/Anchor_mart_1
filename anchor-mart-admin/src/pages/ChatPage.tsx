import { useState, useRef, useEffect } from "react";
import {
  IconSearch,
  IconPaperclip,
  IconSend,
  IconArchive,
  IconUser,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileDrawer, type ProfileDetail } from "@/components/common/ProfileDrawer";
import { toast } from "sonner";

interface Thread {
  n: string;
  id: string;
  l: string;
  tm: string;
  on: boolean;
  un: number;
}

interface Message {
  f: "admin" | "partner";
  t: string;
  time?: string;
}

export function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([
    { n: "Rahul Singh", id: "DP-00124", l: "All 3 items collected. Heading now", tm: "2m", on: true, un: 0 },
    { n: "Pita Havili", id: "DP-00087", l: "All items confirmed at shop", tm: "8m", on: true, un: 2 },
    { n: "Marco Reyes", id: "DP-00201", l: "Heading to Berth 14-B now", tm: "15m", on: true, un: 0 },
    { n: "Aisha Karimi", id: "DP-00056", l: "Available for next assignment", tm: "1h", on: false, un: 0 },
  ]);

  const [activeThreadIndex, setActiveThreadIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileDetail | null>(null);

  // Message histories by thread index
  const [histories, setHistories] = useState<Record<number, Message[]>>({
    0: [
      { f: "admin", t: "Green signal is live for order #ORD-0047. 3 items from Port Marine Supplies. Deliver to Berth 14-B." },
      { f: "partner", t: "Confirmed. Leaving for the store now." },
      { f: "admin", t: "Note: Item 3 is a hydraulic hose, JIC fittings. Verify spec before accepting — do NOT substitute." },
      { f: "partner", t: "At the store. Rope and nav lights collected. Checking the hose with staff now." },
      { f: "partner", t: "They have BSP fittings only, not JIC. Take it or wait for back stock?" },
      { f: "admin", t: "Wait for back stock. 10 minutes — if nothing, I will call the store directly." },
      { f: "partner", t: "Found 2 in the back — JIC, correct spec. All 3 items collected. Heading to Berth 14-B." },
      { f: "admin", t: "Perfect. Mark collected in the app. Ping me once at the berth." },
    ],
    1: [
      { f: "admin", t: "Hi Pita, how is the check at EuroSpar Keppel?" },
      { f: "partner", t: "Almost done. All items confirmed at shop" },
    ],
    2: [
      { f: "partner", t: "Picking up order #AM2458." },
      { f: "admin", t: "Perfect, thank you Marco." },
      { f: "partner", t: "Heading to Berth 14-B now" },
    ],
    3: [
      { f: "partner", t: "Order completed at Anchorage. Available for next assignment" },
    ],
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when message history or active thread changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [histories, activeThreadIndex]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const currentMsg = inputValue;
    setInputValue("");

    // Append to history
    const activeHistory = histories[activeThreadIndex] || [];
    const updatedHistory = [...activeHistory, { f: "admin" as const, t: currentMsg }];
    setHistories({
      ...histories,
      [activeThreadIndex]: updatedHistory,
    });

    // Update threads list
    setThreads(
      threads.map((th, i) =>
        i === activeThreadIndex
          ? {
              ...th,
              l: currentMsg,
              tm: "Just now",
              un: 0,
            }
          : th
      )
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const activeThread = threads[activeThreadIndex];
  const activeHistory = histories[activeThreadIndex] || [];

  const showPartnerProfile = () => {
    setSelectedProfile({
      name: activeThread.n,
      role: "partner",
      email: `${activeThread.n.toLowerCase().replace(" ", "")}@anchormart.io`,
      whatsapp: "+65 9123 4567",
      joined: "March 2023",
      stat1Val: activeThreadIndex === 0 ? "124" : "76",
      stat1Lbl: "Deliveries",
      stat2Val: activeThreadIndex === 0 ? "4.9" : "4.6",
      stat2Lbl: "Rating",
      stat3Val: "$842",
      stat3Lbl: "Earned",
      status: "Active",
    });
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Chat Monitor"
        subtitle="Admin ↔ Delivery Partner real-time communication"
      />

      {/* Grid container matching original height */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: "16px",
          height: "580px",
        }}
      >
        {/* Sidebar Card */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px", borderBottom: "1px solid var(--border-xs)" }}>
            <div className="relative flex items-center">
              <IconSearch size={15} style={{ position: "absolute", left: "10px", color: "var(--t4)" }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search partners..."
                style={{ width: "100%", height: "34px", paddingLeft: "32px", fontSize: "13px" }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {threads.map((ch, idx) => (
              <div
                key={ch.id}
                onClick={() => {
                  setActiveThreadIndex(idx);
                  // Clear unread
                  setThreads(threads.map((t, i) => (i === idx ? { ...t, un: 0 } : t)));
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--border-xs)",
                  cursor: "pointer",
                  background: activeThreadIndex === idx ? "var(--navy-25)" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <div style={{ position: "relative" }}>
                  <div className="av av-teal" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                    {ch.n[0]}
                  </div>
                  {ch.on && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-1px",
                        right: "-1px",
                        width: "8px",
                        height: "8px",
                        background: "var(--green-icon)",
                        borderRadius: "50%",
                        border: "2px solid var(--surface)",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>{ch.n}</div>
                  <div style={{ fontSize: "11px", color: "var(--t4)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ch.l}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: "var(--t4)", fontWeight: 600 }}>{ch.tm}</span>
                  {ch.un > 0 && (
                    <Badge variant="danger" style={{ padding: "1px 5px", fontSize: "10px" }}>
                      {ch.un}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Container Card */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Active Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border-xs)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div className="av av-teal" style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700 }}>
              {activeThread.n[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "var(--t1)", fontSize: "14px" }}>{activeThread.n}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className={`sdot ${activeThread.on ? "on" : "off"}`} />
                <span style={{ fontSize: "11px", color: "var(--t4)", fontWeight: 600 }}>
                  {activeThread.on ? "On duty · ENQ-0042 delivering" : "Offline"}
                </span>
              </div>
            </div>
            <Badge variant="teal">{activeThread.id}</Badge>
            <Button variant="ghost" size="xs" onClick={() => toast.success("Thread archived")}>
              <IconArchive size={16} />
            </Button>
            <Button variant="ghost" size="xs" onClick={showPartnerProfile}>
              <IconUser size={16} />
            </Button>
          </div>

          {/* Message History */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "var(--surface-alt)",
            }}
          >
            {activeHistory.map((m, idx) => {
              const isAdmin = m.f === "admin";
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isAdmin ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    className={`chat-bubble ${isAdmin ? "sent" : "recv"}`}
                    style={{
                      maxWidth: "70%",
                      padding: "10px 14px",
                      borderRadius: "14px",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      lineHeight: 1.4,
                      background: isAdmin ? "var(--navy-600)" : "var(--surface)",
                      color: isAdmin ? "#fff" : "var(--t1)",
                      border: isAdmin ? "none" : "1px solid var(--border-sm)",
                      boxShadow: "var(--sh-xs)",
                      borderTopRightRadius: isAdmin ? 0 : "14px",
                      borderTopLeftRadius: isAdmin ? "14px" : 0,
                    }}
                  >
                    {m.t}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Area */}
          <div
            style={{
              padding: "12px",
              borderTop: "1px solid var(--border-xs)",
              display: "flex",
              gap: "8px",
              background: "var(--surface)",
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              style={{ width: "40px", height: "40px", padding: 0 }}
              onClick={() => toast.success("Attachment selector opened")}
            >
              <IconPaperclip size={16} />
            </Button>
            <input
              type="text"
              className="form-input"
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ flex: 1, height: "40px", borderRadius: "var(--radius-md)" }}
            />
            <Button
              variant="primary"
              style={{ width: "40px", height: "40px", padding: 0 }}
              onClick={handleSend}
            >
              <IconSend size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Driver Profile Drawer */}
      <ProfileDrawer profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
    </div>
  );
}
export default ChatPage;
