import {
  IconArrowRight,
  IconAward,
  IconCup,
  IconDeviceSpeaker,
  IconDeviceWatch,
  IconDroplet,
  IconPill,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import type { TopProduct } from "../types/dashboard.types";

const M = MESSAGES.DASHBOARD;

/* ─── Mock data — pending a top-products endpoint ─────────────────────────── */
const TOP_PRODUCTS: TopProduct[] = [
  {
    name: "Echo Dot 5th Gen",
    category: "Electronics",
    orders: 34,
    icon: <IconDeviceSpeaker size={15} />,
  },
  { name: "Lavazza Coffee", category: "Beverages", orders: 28, icon: <IconCup size={15} /> },
  { name: "Cureskin Tablets", category: "Beauty", orders: 22, icon: <IconPill size={15} /> },
  { name: "Bisleri Water 1L", category: "Express", orders: 19, icon: <IconDroplet size={15} /> },
  {
    name: "Titan Quartz Watch",
    category: "Accessories",
    orders: 16,
    icon: <IconDeviceWatch size={15} />,
  },
];

/** Top-selling products leaderboard. */
export function TopProductsCard() {
  const navigate = useNavigate();
  const goProducts = () => navigate(APP_ROUTES.PRODUCTS);

  return (
    <SectionCard
      bodyPadding="sm"
      bodyClassName="flex flex-col gap-3"
      icon={<IconAward size={17} className="text-[var(--t4)]" />}
      title={M.TOP_PRODUCTS}
      actions={
        <Button variant="ghost" size="xs" onClick={goProducts}>
          {M.VIEW_ALL} <IconArrowRight size={13} />
        </Button>
      }
    >
      {TOP_PRODUCTS.map((p, i) => (
        <button
          type="button"
          key={p.name}
          onClick={goProducts}
          className="flex aic g10 w-full appearance-none border-0 bg-transparent p-0 text-left"
        >
          <span className="w-4 shrink-0 text-[11px] font-extrabold text-[var(--t4)]">{i + 1}</span>
          <div className="prod-thumb !h-8 !w-8">{p.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="trunc text-[12.5px] font-bold text-[var(--t1)]">{p.name}</div>
            <div className="text-[10.5px] text-[var(--t4)]">{p.category}</div>
          </div>
          <Badge variant="teal">{p.orders}</Badge>
        </button>
      ))}
    </SectionCard>
  );
}

export default TopProductsCard;
