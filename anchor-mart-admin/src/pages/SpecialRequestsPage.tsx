import {
  IconCheck,
  IconClipboardText,
  IconClock,
  IconDownload,
  IconEye,
  IconPhoto,
  IconPhotoOff,
  IconSend,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import {
  badgeColumn,
  idColumn,
  textColumn,
  truncatedColumn,
} from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { getFallbackAvatar } from "@/lib/avatar";

interface SpecialRequest {
  r: string;
  n: string;
  e: string;
  ph: string;
  prod: string;
  brand: string;
  qty: number;
  desc: string;
  ship: string;
  dt: string;
  img: boolean;
  st: string;
  sc: "warning" | "info" | "success" | "danger";
}

// Status dropdown options (mirrors the AnchorMart-1 special-requests page).
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

// KPI cards (static figures from the design mock — no requests API yet).
const STAT_ITEMS = [
  {
    id: "total",
    label: "Total Requests",
    value: "28",
    icon: <IconClipboardText size={20} />,
    variant: "navy" as const,
  },
  {
    id: "pending",
    label: "Pending Review",
    value: "5",
    icon: <IconClock size={20} />,
    variant: "amber" as const,
  },
  {
    id: "approved",
    label: "Approved",
    value: "14",
    icon: <IconCheck size={20} />,
    variant: "green" as const,
  },
];

const REQUESTS: SpecialRequest[] = [
  {
    r: "#SRQ-0091",
    n: "Lois Becket",
    e: "lois.becket@maersk.com",
    ph: "+65 8123 4471",
    prod: "Sennheiser HD 450BT Headphones",
    brand: "Sennheiser",
    qty: 1,
    desc: "Wireless noise-cancelling headphones, black colour preferred. Needed before next sailing.",
    ship: "MSC Marvela · Berth 7",
    dt: "02 Jun 2026 · 09:14",
    img: true,
    st: "Pending",
    sc: "warning",
  },
  {
    r: "#SRQ-0090",
    n: "Ali Mahmoud",
    e: "ali.mahmoud@apl.com",
    ph: "+65 9034 1182",
    prod: "Omega-3 Fish Oil Capsules",
    brand: "Nordic Naturals",
    qty: 3,
    desc: "1000mg softgels, 120 count bottles. Required for crew health supplies.",
    ship: "APL Vanda · PSA",
    dt: "01 Jun 2026 · 17:42",
    img: false,
    st: "Approved",
    sc: "success",
  },
  {
    r: "#SRQ-0089",
    n: "James Wren",
    e: "j.wren@evergreen-line.com",
    ph: "+65 8890 2245",
    prod: "Casio G-Shock GA-2100 Watch",
    brand: "Casio",
    qty: 1,
    desc: "Carbon core guard, black resin band. Gift for end of contract.",
    ship: "Evergreen Ace · Brani",
    dt: "01 Jun 2026 · 11:08",
    img: true,
    st: "Approved",
    sc: "success",
  },
  {
    r: "#SRQ-0088",
    n: "Sara Chen",
    e: "sara.chen@oocl.com",
    ph: "+65 9112 7763",
    prod: "Korean Skincare Set (COSRX)",
    brand: "COSRX",
    qty: 2,
    desc: "Snail mucin essence + acne patches. Any variant acceptable.",
    ship: "OOCL Tokyo · Anch. 2",
    dt: "31 May 2026 · 20:31",
    img: false,
    st: "Pending",
    sc: "warning",
  },
  {
    r: "#SRQ-0087",
    n: "Ravi Patel",
    e: "ravi.patel@anglo-eastern.com",
    ph: "+65 8456 9920",
    prod: "Bose SoundLink Flex Speaker",
    brand: "Bose",
    qty: 1,
    desc: "Portable bluetooth speaker, waterproof. Blue or black.",
    ship: "IMO 0123456 · PSA",
    dt: "31 May 2026 · 08:55",
    img: false,
    st: "Rejected",
    sc: "danger",
  },
];

export function SpecialRequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<SpecialRequest | null>(null);

  const openDetail = (req: SpecialRequest) => setSelectedRequest(req);
  const closeDetail = () => setSelectedRequest(null);

  const filteredRequests = REQUESTS.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.r.toLowerCase().includes(q) ||
      r.n.toLowerCase().includes(q) ||
      r.prod.toLowerCase().includes(q) ||
      r.brand.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || r.st === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<SpecialRequest>[] = [
    idColumn({ id: "ref", header: "Order ID", get: (r) => r.r }),
    {
      id: "sailor",
      header: "Sailor",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="av av-sm av-img">
            <img src={getFallbackAvatar(r.n)} alt={r.n} loading="lazy" />
          </div>
          <div>
            <div className="td-p">{r.n}</div>
            <div className="td-m">{r.e}</div>
          </div>
        </div>
      ),
    },
    textColumn({ id: "phone", header: "Phone", get: (r) => r.ph, className: "td-m" }),
    truncatedColumn({ id: "product", header: "Product", get: (r) => r.prod }),
    textColumn({ id: "brand", header: "Brand", get: (r) => r.brand, className: "td-m" }),
    textColumn({
      id: "qty",
      header: "Qty",
      get: (r) => r.qty,
      className: "td-m text-center",
      headerClassName: "text-center",
    }),
    textColumn({ id: "requested", header: "Requested", get: (r) => r.dt, className: "td-m" }),
    badgeColumn({ id: "status", header: "Status", get: (r) => r.st, variant: (r) => r.sc }),
    {
      id: "actions",
      header: "Actions",
      className: "w-16 text-right",
      headerClassName: "text-right",
      cell: (r) => (
        <div className="td-acts">
          <Button
            variant="ghost"
            size="xs"
            title="View"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(r);
            }}
          >
            <IconEye size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title="Special Request Items"
        subtitle="Custom item requests submitted by sailors from the app"
        actions={
          <SearchFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search requests..."
            filters={[
              {
                id: "status",
                value: statusFilter,
                placeholder: "All Status",
                options: STATUS_OPTIONS,
                width: "150px",
                onValueChange: setStatusFilter,
              },
            ]}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast.success("Exported requests CSV")}
            >
              <IconDownload size={15} className="mr-1" />
              Export
            </Button>
          </SearchFilters>
        }
      />

      <StatsGrid items={STAT_ITEMS} />

      <DataTable
        columns={columns}
        data={filteredRequests}
        rowKey="r"
        emptyMessage="No requests match the current filters."
        onRowClick={openDetail}
      />

      {selectedRequest && <SpecialRequestDetail request={selectedRequest} onClose={closeDetail} />}
    </div>
  );
}

/** Read-only review modal mirroring the AnchorMart-1 special-request detail. */
function SpecialRequestDetail({
  request,
  onClose,
}: {
  request: SpecialRequest;
  onClose: () => void;
}) {
  const [vessel, terminal] = (request.ship || "").split(" · ");

  const reject = () => {
    onClose();
    toast.error("Request rejected and sailor notified");
  };
  const confirm = () => {
    onClose();
    toast.success("Payment link sent to sailor");
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-close; the X button and sibling content stay keyboard-accessible */}
      <div
        className="absolute inset-0 bg-[rgba(5,14,28,0.45)] backdrop-blur-sm"
        role="presentation"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-sm)] bg-[var(--surface)] shadow-[var(--sh-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-xs)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconClipboardText size={20} />
            </div>
            <div>
              <div className="text-[16px] font-extrabold text-[var(--t1)]">
                Special Request Item
              </div>
              <div className="text-[12px] text-[var(--t3)]">{request.r}</div>
            </div>
          </div>
          <Button variant="ghost" size="xs" onClick={onClose} aria-label="Close">
            <IconX size={18} />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Requested By */}
          <div className="sec-label">Requested By</div>
          <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
            <div className="mb-3.5 flex items-center gap-3">
              <div className="av av-img">
                <img src={getFallbackAvatar(request.n)} alt={request.n} />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold text-[var(--t1)]">{request.n}</div>
                <div className="text-[11px] text-[var(--t4)]">Sailor</div>
              </div>
              <Badge variant={request.sc}>{request.st}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="mini-stat">
                <div className="mini-stat-val text-[13px] tracking-normal">{request.e}</div>
                <div className="mini-stat-lbl">Email</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val mono text-[13px] tracking-normal">{request.ph}</div>
                <div className="mini-stat-lbl">Phone</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val text-[13px] tracking-normal">{request.ship}</div>
                <div className="mini-stat-lbl">Ship / Port</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val text-[13px] tracking-normal">{request.dt}</div>
                <div className="mini-stat-lbl">Date of Request</div>
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className="sec-label">Item Details</div>
          <div className="form-row">
            <div className="fg">
              <span className="fg-label">Product Name</span>
              <div className="ecard">{request.prod}</div>
            </div>
            <div className="fg">
              <span className="fg-label">Brand</span>
              <div className="ecard">{request.brand}</div>
            </div>
          </div>
          <div className="form-row">
            <div className="fg">
              <span className="fg-label">Quantity</span>
              <div className="ecard">{request.qty}</div>
            </div>
            <div className="fg" />
          </div>
          <div className="fg">
            <span className="fg-label">Description</span>
            <div className="ecard leading-relaxed">{request.desc}</div>
          </div>
          <div className="fg">
            <span className="fg-label">Uploaded Image</span>
            {request.img ? (
              <div className="srq-img">
                <IconPhoto size={26} />
                <span>product-image.jpg</span>
              </div>
            ) : (
              <div className="srq-img empty">
                <IconPhotoOff size={26} />
                <span>No image provided</span>
              </div>
            )}
          </div>

          {/* Ship & Delivery Information */}
          <div className="sec-label mt-4">Ship &amp; Delivery Information</div>
          <div className="form-row">
            <div className="fg">
              <span className="fg-label">Ship Information</span>
              <input className="form-input" defaultValue={vessel ?? ""} placeholder="Vessel name" />
            </div>
            <div className="fg">
              <span className="fg-label">IMO Number</span>
              <input className="form-input mono" placeholder="IMO 0000000" defaultValue="0123456" />
            </div>
          </div>
          <div className="form-row triple">
            <div className="fg">
              <span className="fg-label">Stroke Terminal</span>
              <input
                className="form-input"
                placeholder="e.g. Berth 7"
                defaultValue={terminal ?? ""}
              />
            </div>
            <div className="fg">
              <span className="fg-label">Expected Arrival Date</span>
              <input className="form-input" type="date" />
            </div>
            <div className="fg">
              <span className="fg-label">Expected Arrival Time</span>
              <input className="form-input" type="time" />
            </div>
          </div>
          <div className="form-row">
            <div className="fg">
              <span className="fg-label">Expected Stay</span>
              <input className="form-input" placeholder="e.g. 2 days" />
            </div>
            <div className="fg">
              <span className="fg-label">Communication Preference</span>
              <select className="form-select">
                <option>WhatsApp</option>
                <option>Email</option>
              </select>
            </div>
          </div>
          <div className="fg">
            <span className="fg-label">Special Instructions for Delivery Partner</span>
            <textarea
              className="form-input h-16"
              placeholder="Any delivery notes for the partner…"
            />
          </div>

          {/* Pricing */}
          <div className="sec-label mt-4">Pricing</div>
          <div className="form-row">
            <div className="fg">
              <span className="fg-label">Estimated Price ($)</span>
              <input
                className="form-input"
                type="number"
                placeholder="Enter estimated price set by admin"
              />
            </div>
            <div className="fg" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 border-t border-[var(--border-xs)] bg-[var(--surface-alt)] px-6 py-4">
          <Button variant="danger" size="sm" onClick={reject}>
            <IconX size={15} className="mr-1" />
            Reject
          </Button>
          <Button variant="primary" size="sm" onClick={confirm}>
            <IconSend size={15} className="mr-1" />
            Confirm &amp; Send Payment Link
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SpecialRequestsPage;
