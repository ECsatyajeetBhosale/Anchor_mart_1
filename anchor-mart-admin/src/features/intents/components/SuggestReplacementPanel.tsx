import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { StringListField } from "@/components/common/StringListField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGetCategoriesQuery } from "@/features/catalog";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconCheck, IconReplace } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useGetSuggestedItemsQuery,
  useGetVerificationDetailQuery,
  useLazyGetSuggestionProductsQuery,
  useStageSuggestionMutation,
  useSuggestNewProductMutation,
} from "../api/substitutionApi";
import type { VerificationLine } from "../types/intent.types";

const S = MESSAGES.INTENTS.SUBSTITUTION;
const T = MESSAGES.INTENTS.TOAST;

export interface SuggestReplacementPanelProps {
  orderId: string;
  /** Port UUID for the variant picker; "" when it couldn't be resolved. */
  portId: string;
  /** Whether the signed-in admin may stage suggestions (Flow 27 gate). */
  canManage: boolean;
}

/** Availability badge for a verified line. */
function lineBadge(line: VerificationLine) {
  if (line.isAvailable === false) return <Badge variant="danger">{S.LINE_UNAVAILABLE}</Badge>;
  if (line.shortfall > 0) return <Badge variant="warning">{S.LINE_SHORT}</Badge>;
  return <Badge variant="success">{S.LINE_AVAILABLE}</Badge>;
}

/**
 * Flow 06 admin substitution — reads the verified report (API 6), lets the
 * admin stage a replacement variant per unavailable/short line (picker = API
 * 10, stage = API 11), and lists staged/released suggestions (API 9). Release
 * (API 13) is the drawer's primary action, not here.
 */
export function SuggestReplacementPanel({
  orderId,
  portId,
  canManage,
}: SuggestReplacementPanelProps) {
  const { data: detail, isLoading: detailLoading } = useGetVerificationDetailQuery(orderId, {
    skip: !orderId,
  });
  const { data: staged = [] } = useGetSuggestedItemsQuery(orderId, { skip: !orderId });

  const [fetchVariants, { data: variants = [], isFetching: variantsLoading }] =
    useLazyGetSuggestionProductsQuery();
  const [stageSuggestion, { isLoading: staging }] = useStageSuggestionMutation();
  const [suggestNewProduct, { isLoading: creatingNew }] = useSuggestNewProductMutation();

  // Which line's inline suggest form is open, its mode, and its field state.
  const [openLineId, setOpenLineId] = useState<string | null>(null);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  // New-product (API 12) fields.
  const [npName, setNpName] = useState("");
  const [npSku, setNpSku] = useState("");
  const [npPrice, setNpPrice] = useState("");
  const [npCategory, setNpCategory] = useState("");
  const [npDescription, setNpDescription] = useState("");
  const [npImages, setNpImages] = useState<string[]>([]);
  /** Raw JSON text for `attributes`; parsed (and validated) only on submit. */
  const [npAttributes, setNpAttributes] = useState("");

  // Categories for the new-product form (fetched only when the panel renders).
  const { data: categoryData, isLoading: categoriesLoading } = useGetCategoriesQuery(
    { limit: 100, isActive: true },
    { skip: !orderId },
  );
  const categoryOptions = (categoryData?.results?.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const busy = staging || creatingNew;

  // The intent list may not carry a port UUID (confirmed absent in the live
  // payload), so prefer the one from the verification report's order block.
  const effectivePortId = detail?.portId || portId;

  const openForm = (line: VerificationLine) => {
    setOpenLineId(line.orderItemId);
    setMode("existing");
    setSearch("");
    setVariantId("");
    setQuantity(String(line.shortfall || line.requestedQty || 1));
    setNote("");
    setNpName("");
    setNpSku("");
    setNpPrice("");
    setNpCategory("");
    setNpDescription("");
    setNpImages([]);
    setNpAttributes("");
    if (effectivePortId) fetchVariants({ portId: effectivePortId });
  };

  const runSearch = () => {
    if (effectivePortId) fetchVariants({ portId: effectivePortId, search });
  };

  /** Normalised quantity, sent as a string to match the documented request. */
  const qty = () => String(Math.max(1, Number.parseInt(quantity, 10) || 1));

  /**
   * Parse the optional `attributes` JSON. Returns `undefined` when blank (the
   * key is then omitted) and `null` when the text isn't a JSON object, which
   * the caller treats as a validation failure.
   */
  const parseAttributes = (): Record<string, unknown> | undefined | null => {
    const raw = npAttributes.trim();
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  // API 11 — stage an existing catalog variant.
  const handleStage = async (line: VerificationLine) => {
    try {
      await stageSuggestion({
        orderId,
        body: {
          order_item_id: line.orderItemId,
          variant_id: variantId,
          quantity: qty(),
          note: note.trim() || undefined,
        },
      }).unwrap();
      toast.success(T.STAGED);
      setOpenLineId(null);
    } catch (err) {
      toast.error(getApiMessage(err) ?? T.STAGE_FAILED);
    }
  };

  // API 12 — create a brand-new product + variant and stage it.
  const handleStageNew = async (line: VerificationLine) => {
    if (!npName.trim() || !npSku.trim() || !npPrice.trim() || !npCategory) {
      toast.error(S.NP_REQUIRED);
      return;
    }
    const attributes = parseAttributes();
    if (attributes === null) {
      toast.error(S.NP_ATTRIBUTES_INVALID);
      return;
    }
    const images = npImages.map((i) => i.trim()).filter(Boolean);
    try {
      await suggestNewProduct({
        orderId,
        body: {
          order_item_id: line.orderItemId,
          quantity: qty(),
          category: npCategory,
          name: npName.trim(),
          base_price: npPrice.trim(),
          sku: npSku.trim(),
          description: npDescription.trim() || undefined,
          note: note.trim() || undefined,
          // Optional keys are omitted entirely rather than sent empty.
          attributes,
          images: images.length ? images : undefined,
        },
      }).unwrap();
      toast.success(T.STAGED);
      setOpenLineId(null);
    } catch (err) {
      toast.error(getApiMessage(err) ?? T.STAGE_FAILED);
    }
  };

  if (detailLoading) {
    return <div className="td-m">…</div>;
  }
  const lines = detail?.lines ?? [];
  if (lines.length === 0) {
    return <div className="td-m">{S.NO_REPORT}</div>;
  }

  const variantOptions = variants.map((v) => ({
    value: v.variantId,
    label: `${v.productName}${v.variantName ? ` · ${v.variantName}` : ""}${v.sku ? ` · ${v.sku}` : ""}${v.price ? ` · $${v.price}` : ""}`,
  }));

  return (
    <div className="flex flex-col gap-2.5">
      {detail?.partnerName && <div className="td-m">{S.VERIFIED_BY(detail.partnerName)}</div>}

      {lines.map((line) => {
        const isOpen = openLineId === line.orderItemId;
        return (
          <div className="ecard flex flex-col gap-2" key={line.orderItemId}>
            <div className="flex aic g12">
              <div className="f1">
                <div className="sm w7 c1">{line.name}</div>
                <div className="xs c4">
                  {S.REQUESTED(line.requestedQty)}
                  {line.availableQty !== null ? ` · ${S.AVAILABLE_QTY(line.availableQty)}` : ""}
                  {line.note ? ` · ${line.note}` : ""}
                </div>
              </div>
              {lineBadge(line)}
              {canManage && line.needsSuggestion && (
                <Button
                  variant="teal"
                  size="xs"
                  onClick={() => (isOpen ? setOpenLineId(null) : openForm(line))}
                >
                  <IconReplace size={13} className="mr-1" />
                  {S.SUGGEST}
                </Button>
              )}
            </div>

            {isOpen && (
              <div className="flex flex-col gap-2 border-t border-[var(--border-xs)] pt-2">
                {/* Existing vs new-product toggle. */}
                <div className="flex g8">
                  <Button
                    variant={mode === "existing" ? "teal" : "secondary"}
                    size="xs"
                    onClick={() => setMode("existing")}
                  >
                    {S.MODE_EXISTING}
                  </Button>
                  <Button
                    variant={mode === "new" ? "teal" : "secondary"}
                    size="xs"
                    onClick={() => setMode("new")}
                  >
                    {S.MODE_NEW}
                  </Button>
                </div>

                {mode === "existing" ? (
                  !effectivePortId ? (
                    <div className="fg-error text-[var(--danger-text)] text-[11px] font-semibold">
                      {S.NO_PORT}
                    </div>
                  ) : (
                    <>
                      <div className="flex g8">
                        <Input
                          placeholder={S.SEARCH_PRODUCTS}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && runSearch()}
                        />
                        <Button variant="secondary" size="sm" onClick={runSearch}>
                          Search
                        </Button>
                      </div>
                      <FormField label={S.PICK_VARIANT}>
                        <DropdownSelect
                          value={variantId}
                          onValueChange={setVariantId}
                          placeholder={variantsLoading ? "…" : S.PICK_VARIANT}
                          options={variantOptions}
                          width="100%"
                        />
                      </FormField>
                      <div className="form-row !mb-0">
                        <FormField label={S.QTY}>
                          <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                          />
                        </FormField>
                        <FormField label={S.NOTE}>
                          <Input
                            placeholder={S.NOTE_PLACEHOLDER}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                          />
                        </FormField>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={!variantId || busy}
                          onClick={() => handleStage(line)}
                        >
                          <IconCheck size={14} className="mr-1" />
                          {busy ? S.STAGING : S.STAGE}
                        </Button>
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <div className="form-row !mb-0">
                      <FormField label={S.NP_NAME}>
                        <Input value={npName} onChange={(e) => setNpName(e.target.value)} />
                      </FormField>
                      <FormField label={S.NP_SKU}>
                        <Input value={npSku} onChange={(e) => setNpSku(e.target.value)} />
                      </FormField>
                    </div>
                    <div className="form-row !mb-0">
                      <FormField label={S.NP_PRICE}>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={npPrice}
                          onChange={(e) => setNpPrice(e.target.value)}
                        />
                      </FormField>
                      <FormField label={S.QTY}>
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                        />
                      </FormField>
                    </div>
                    <FormField label={S.NP_CATEGORY}>
                      <DropdownSelect
                        value={npCategory}
                        onValueChange={setNpCategory}
                        placeholder={
                          categoriesLoading ? S.NP_CATEGORY_LOADING : S.NP_CATEGORY_PLACEHOLDER
                        }
                        options={categoryOptions}
                        width="100%"
                      />
                    </FormField>
                    <FormField label={S.NP_DESCRIPTION}>
                      <Input
                        placeholder={S.NP_DESCRIPTION_PLACEHOLDER}
                        value={npDescription}
                        onChange={(e) => setNpDescription(e.target.value)}
                      />
                    </FormField>
                    <FormField label={S.NP_IMAGES}>
                      <StringListField
                        values={npImages}
                        onChange={setNpImages}
                        placeholder={S.NP_IMAGES_PLACEHOLDER}
                        addLabel={S.NP_IMAGES_ADD}
                        emptyHint={S.NP_IMAGES_EMPTY}
                        mono
                      />
                    </FormField>
                    <FormField label={S.NP_ATTRIBUTES} hint={S.NP_ATTRIBUTES_HINT}>
                      <Textarea
                        className="mono h-20"
                        placeholder={S.NP_ATTRIBUTES_PLACEHOLDER}
                        value={npAttributes}
                        onChange={(e) => setNpAttributes(e.target.value)}
                      />
                    </FormField>
                    <FormField label={S.NOTE}>
                      <Input
                        placeholder={S.NOTE_PLACEHOLDER}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </FormField>
                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleStageNew(line)}
                      >
                        <IconCheck size={14} className="mr-1" />
                        {busy ? S.STAGING : S.STAGE}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Staged / released suggestions */}
      <div className="sec-label mt16">{S.STAGED_TITLE}</div>
      {staged.length === 0 ? (
        <div className="td-m">{S.STAGED_EMPTY}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {staged.map((s) => (
            <div className="ecard flex aic g12" key={s.suggestionId}>
              <div className="f1">
                <div className="sm w7 c1">
                  {s.originalName} → {s.suggestedName}
                </div>
                <div className="xs c4">
                  {s.suggestedSku ? `${s.suggestedSku} · ` : ""}
                  {S.QTY} {s.quantity}
                  {s.unitPrice ? ` · $${s.unitPrice}` : ""}
                </div>
              </div>
              <Badge variant={s.released ? "success" : "warning"}>
                {s.released ? S.RELEASED_BADGE : S.STAGED_BADGE}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SuggestReplacementPanel;
