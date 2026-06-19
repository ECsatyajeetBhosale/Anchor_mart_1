import {
  IconBan,
  IconEdit,
  IconEye,
  IconGift,
  IconMessage,
  IconPlus,
  IconShare,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DropdownSelect } from "@/components/common/DropdownSelect";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { PageHeader } from "@/components/common/PageHeader";
import { type ProfileDetail, ProfileDrawer } from "@/components/common/ProfileDrawer";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TableActions } from "@/components/common/TableActions";
import { textColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type StatusVariant = "success" | "neutral" | "info" | "danger" | "warning";

interface SailorData {
  n: string;
  e: string;
  w: string;
  j: string;
  sh: string;
  o: number;
  p: number;
  ca: number;
  wi: number;
  st: string;
  sc: StatusVariant;
}

const SAILOR_TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "New Signups", value: "new" },
  { label: "Blocked", value: "blocked" },
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "New", value: "new" },
  { label: "Blocked", value: "blocked" },
];

/** Maps a sailor status string to its badge colour variant. */
const statusVariant = (status: string): StatusVariant =>
  status === "Active"
    ? "success"
    : status === "New"
      ? "info"
      : status === "Blocked"
        ? "danger"
        : "neutral";

const initialSailors: SailorData[] = [
  {
    n: "Lois Becket",
    e: "loisbecket@gmail.com",
    w: "+44 7700 900124",
    j: "Mar 12, 2026",
    sh: "IMO 0123456",
    o: 18,
    p: 2450,
    ca: 1,
    wi: 3,
    st: "Active",
    sc: "success",
  },
  {
    n: "Ali Mahmoud",
    e: "ali.m@vessel.com",
    w: "+971 50 444 1234",
    j: "Jan 8, 2026",
    sh: "MSC Marvela",
    o: 12,
    p: 1820,
    ca: 2,
    wi: 5,
    st: "Active",
    sc: "success",
  },
  {
    n: "Sara Chen",
    e: "sara.c@marine.io",
    w: "+65 9123 4567",
    j: "Feb 22, 2026",
    sh: "APL Vanda",
    o: 7,
    p: 920,
    ca: 0,
    wi: 2,
    st: "Active",
    sc: "success",
  },
  {
    n: "James Wren",
    e: "jwren@shipco.net",
    w: "+44 7900 112233",
    j: "Dec 3, 2025",
    sh: "Evergreen Faith",
    o: 31,
    p: 5100,
    ca: 0,
    wi: 8,
    st: "Active",
    sc: "success",
  },
  {
    n: "Ravi Patel",
    e: "ravi.p@anchormail.com",
    w: "+91 98765 43210",
    j: "Apr 1, 2026",
    sh: "IMO 0123456",
    o: 2,
    p: 200,
    ca: 6,
    wi: 1,
    st: "New",
    sc: "info",
  },
  {
    n: "Maria Santos",
    e: "msantos@seafarer.ph",
    w: "+63 912 345 6789",
    j: "Nov 14, 2025",
    sh: "MSC Marvela",
    o: 0,
    p: 0,
    ca: 0,
    wi: 0,
    st: "Inactive",
    sc: "neutral",
  },
];

export function SailorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sailors, setSailors] = useState<SailorData[]>(initialSailors);

  const [selectedProfile, setSelectedProfile] = useState<ProfileDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSailor, setEditSailor] = useState<SailorData | null>(null);
  const [sailorToBlock, setSailorToBlock] = useState<SailorData | null>(null);

  // Form state for the add/edit dialog.
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formComm, setFormComm] = useState("whatsapp");
  const [formShip, setFormShip] = useState("");
  const [formPort, setFormPort] = useState("");
  const [formLogin, setFormLogin] = useState("email_password");
  const [formStatus, setFormStatus] = useState("Active");

  // URL-driven filter state (shareable, refresh-safe).
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";
  const activeTab = searchParams.get("tab") ?? "all";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const openAddModal = (sailor?: SailorData) => {
    if (sailor) {
      setEditSailor(sailor);
      setFormName(sailor.n);
      setFormEmail(sailor.e);
      setFormWhatsapp(sailor.w);
      setFormShip(sailor.sh);
      setFormStatus(sailor.st);
    } else {
      setEditSailor(null);
      setFormName("");
      setFormEmail("");
      setFormWhatsapp("");
      setFormShip("");
      setFormStatus("Active");
    }
    setFormComm("whatsapp");
    setFormPort("");
    setFormLogin("email_password");
    setIsModalOpen(true);
  };

  const handleSaveSailor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      toast.error("Name and Email are required");
      return;
    }

    if (editSailor) {
      setSailors(
        sailors.map((s) =>
          s.e === editSailor.e
            ? {
                ...s,
                n: formName,
                e: formEmail,
                w: formWhatsapp,
                sh: formShip,
                st: formStatus,
                sc: statusVariant(formStatus),
              }
            : s,
        ),
      );
      setIsModalOpen(false);
      toast.success("Sailor profile updated successfully");
    } else {
      const newSailor: SailorData = {
        n: formName,
        e: formEmail,
        w: formWhatsapp,
        sh: formShip,
        j: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        o: 0,
        p: 0,
        ca: 0,
        wi: 0,
        st: formStatus,
        sc: statusVariant(formStatus),
      };
      setSailors([newSailor, ...sailors]);
      setIsModalOpen(false);
      toast.success("New sailor registered successfully");
    }
  };

  const handleConfirmBlock = () => {
    if (!sailorToBlock) return;
    setSailors(
      sailors.map((s) =>
        s.n === sailorToBlock.n ? { ...s, st: "Blocked", sc: "danger" as const } : s,
      ),
    );
    toast.error(`${sailorToBlock.n} has been blocked`);
    setSailorToBlock(null);
  };

  const showSailorProfile = (s: SailorData) => {
    setSelectedProfile({
      name: s.n,
      role: "sailor",
      email: s.e,
      whatsapp: s.w,
      joined: s.j,
      stat1Val: String(s.o),
      stat1Lbl: "Orders",
      stat2Val: s.o > 0 ? `$${Math.round(1500 / s.o)}` : "—",
      stat2Lbl: "Avg Order",
      stat3Val: s.p.toLocaleString(),
      stat3Lbl: "Loyalty Pts",
      status: s.st,
    });
  };

  // Search + status dropdown + tab all filter the list.
  const filteredSailors = sailors.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      s.n.toLowerCase().includes(q) ||
      s.e.toLowerCase().includes(q) ||
      s.w.toLowerCase().includes(q) ||
      s.sh.toLowerCase().includes(q);

    const matchesDropdown = statusFilter === "all" || s.st.toLowerCase() === statusFilter;
    const matchesTab = activeTab === "all" || s.st.toLowerCase() === activeTab;

    return matchesSearch && matchesDropdown && matchesTab;
  });

  const statItems = [
    {
      id: "total",
      label: "Total Sailors",
      value: "2,847",
      icon: <IconUsers size={20} />,
      variant: "navy" as const,
      delta: { value: "220", direction: "up" as const },
      footer: "this month",
    },
    {
      id: "active",
      label: "Active This Month",
      value: "1,204",
      icon: <IconUserCheck size={20} />,
      variant: "green" as const,
      footer: "42.3% engagement",
    },
    {
      id: "loyalty",
      label: "Loyalty Pts Issued",
      value: "4.82M",
      icon: <IconGift size={20} />,
      variant: "amber" as const,
      footer: "≈ $48,200 value",
    },
    {
      id: "referrals",
      label: "Referrals (Month)",
      value: "148",
      icon: <IconShare size={20} />,
      variant: "teal" as const,
      footer: "+500 pts each",
    },
  ];

  const columns: Column<SailorData>[] = [
    {
      id: "sailor",
      header: "Sailor",
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="av av-navy">{s.n[0]}</div>
          <div>
            <div className="td-p">{s.n}</div>
            <div className="td-m">{s.e}</div>
          </div>
        </div>
      ),
    },
    textColumn({ id: "contact", header: "Contact", get: (s) => s.w, className: "td-m" }),
    textColumn({ id: "joined", header: "Joined", get: (s) => s.j, className: "td-m" }),
    textColumn({ id: "ship", header: "Ship", get: (s) => s.sh, className: "td-m" }),
    textColumn({ id: "orders", header: "Orders", get: (s) => s.o, className: "td-p w7" }),
    {
      id: "loyalty",
      header: "Loyalty Pts",
      cell: (s) => (
        <>
          <span className="camber w7">{s.p.toLocaleString()}</span>
          <span className="td-m"> pts</span>
        </>
      ),
    },
    textColumn({
      id: "cartwish",
      header: "Cart/Wish",
      get: (s) => `${s.ca} · ${s.wi}`,
      className: "td-m",
    }),
    {
      id: "status",
      header: "Status",
      cell: (s) => (
        <Badge variant={s.sc} className="text-[10px]">
          {s.st}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      className: "w-32 text-right",
      headerClassName: "text-right",
      cell: (s) => (
        <TableActions
          row={s}
          actions={[
            {
              icon: <IconEye size={16} />,
              title: "View",
              onClick: (e) => {
                e.stopPropagation();
                showSailorProfile(s);
              },
            },
            {
              icon: <IconEdit size={16} />,
              title: "Edit",
              onClick: (e) => {
                e.stopPropagation();
                openAddModal(s);
              },
            },
            {
              icon: <IconMessage size={16} />,
              title: "Message",
              onClick: (e) => {
                e.stopPropagation();
                toast.success(`Opening WhatsApp chat to ${s.w}`);
              },
            },
            {
              icon: <IconBan size={16} />,
              title: "Block",
              variant: "danger",
              onClick: (e) => {
                e.stopPropagation();
                setSailorToBlock(s);
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Sailors Management"
        subtitle={
          <p className="pg-sub">
            <span>2,847 registered</span>
            <span className="sep">·</span>
            <span>1,204 active this month</span>
          </p>
        }
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setParam("search", val)}
            searchPlaceholder="Search sailors..."
            searchDebounceMs={300}
            filters={[
              {
                id: "status",
                value: statusFilter,
                placeholder: "All Status",
                options: STATUS_OPTIONS,
                width: "150px",
                onValueChange: (val) => setParam("status", val),
              },
            ]}
          >
            <button type="button" className="btn btn-primary" onClick={() => openAddModal()}>
              <IconPlus size={16} />
              Add Sailor
            </button>
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} />

      <DynamicTabs
        tabs={SAILOR_TABS}
        value={activeTab}
        onTabChange={(val) => setParam("tab", val)}
      />

      <DataTable
        columns={columns}
        data={filteredSailors}
        rowKey="e"
        showPagination={false}
        emptyMessage="No sailors match the current filters."
        onRowClick={showSailorProfile}
      />

      <ProfileDrawer
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onEdit={(p) => {
          setSelectedProfile(null);
          const found = sailors.find((s) => s.n === p.name);
          if (found) openAddModal(found);
        }}
      />

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editSailor ? "Edit Sailor" : "Add New Sailor"}</DialogTitle>
            <DialogDescription>
              {editSailor
                ? "Update sailor account details"
                : "Register a new sailor to the platform"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSailor} className="flex flex-col gap-4">
            <FormRow>
              <FormField label="Full Name">
                <Input
                  placeholder="e.g. Lois Becket"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </FormField>
              <FormField label="Email Address">
                <Input
                  type="email"
                  placeholder="sailor@email.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="WhatsApp Number">
                <Input
                  placeholder="+44 7700 900000"
                  value={formWhatsapp}
                  onChange={(e) => setFormWhatsapp(e.target.value)}
                />
              </FormField>
              <FormField label="Comm. Preference">
                <DropdownSelect
                  value={formComm}
                  width="100%"
                  options={[
                    { label: "WhatsApp", value: "whatsapp" },
                    { label: "Email", value: "email" },
                  ]}
                  onValueChange={setFormComm}
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Ship Name / IMO">
                <Input
                  placeholder="e.g. MSC Marvela / 0123456"
                  value={formShip}
                  onChange={(e) => setFormShip(e.target.value)}
                />
              </FormField>
              <FormField label="Port of Call">
                <Input
                  placeholder="e.g. Port of Singapore"
                  value={formPort}
                  onChange={(e) => setFormPort(e.target.value)}
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Login Method">
                <DropdownSelect
                  value={formLogin}
                  width="100%"
                  options={[
                    { label: "Email + Password", value: "email_password" },
                    { label: "WhatsApp OTP", value: "whatsapp_otp" },
                    { label: "Email OTP", value: "email_otp" },
                  ]}
                  onValueChange={setFormLogin}
                />
              </FormField>
              <FormField label="Account Status">
                <DropdownSelect
                  value={formStatus}
                  width="100%"
                  options={[
                    { label: "Active", value: "Active" },
                    { label: "Inactive", value: "Inactive" },
                    { label: "New", value: "New" },
                    { label: "Blocked", value: "Blocked" },
                  ]}
                  onValueChange={setFormStatus}
                />
              </FormField>
            </FormRow>

            <DialogFooter className="mt-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                {editSailor ? "Save Changes" : "Add Sailor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!sailorToBlock}
        onClose={() => setSailorToBlock(null)}
        onConfirm={handleConfirmBlock}
        title="Block Sailor"
        description={
          sailorToBlock ? `Block ${sailorToBlock.n}? They will lose app access immediately.` : ""
        }
        confirmText="Block"
      />
    </>
  );
}
