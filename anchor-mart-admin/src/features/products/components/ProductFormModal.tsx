import { useState } from "react";
import {
  IconBoxSeam,
  IconCloudUpload,
  IconCheck,
  IconPlus,
  IconTrash,
  IconPhoto,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { FormRow } from "@/components/common/FormRow";
import { FormField } from "@/components/common/FormField";

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any | null;
}

export function ProductFormModal({ isOpen, onClose, product }: ProductFormModalProps) {
  const [activeTab, setActiveTab] = useState("pt-basic");

  const isEditing = !!product;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" adjustable defaultWidth={800} className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]">
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg"
              style={{ background: "var(--teal-50)", color: "var(--teal-600)" }}
            >
              <IconBoxSeam size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">
                {isEditing ? "Edit Product" : "Add New Product"}
              </SheetTitle>
              <SheetDescription>
                {isEditing ? "Update your product details" : "Create a new product for your catalog"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <div className="sticky top-0 bg-[var(--surface)] z-10" style={{ marginBottom: 18, paddingTop: 10 }}>
            <DynamicTabs
              tabs={[
                { label: "Basic Info", value: "pt-basic" },
                { label: "Media", value: "pt-media" },
                { label: "Pricing", value: "pt-pricing" },
                { label: "Shipping", value: "pt-shipping" },
                { label: "Variants", value: "pt-variants" },
              ]}
              value={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* Basic Info Tab */}
          {activeTab === "pt-basic" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">Product Details</div>
              <FormRow>
                <FormField label="Product Title *">
                  <input
                    className="form-input"
                    placeholder="Enter product name"
                    defaultValue={product?.name || ""}
                  />
                </FormField>
                <FormField label="Product Subtitle">
                  <input className="form-input" placeholder="Short product tagline" />
                </FormField>
              </FormRow>
              <FormField label="Product Slug / URL Handle" hint="Auto-generated from the title — editable">
                <input
                  className="form-input mono"
                  placeholder="auto-generated-from-title"
                />
              </FormField>
              <FormField label="Product Description">
                <textarea
                  className="form-input"
                  placeholder="Enter a detailed description for this product..."
                  style={{ height: 120 }}
                  defaultValue={product?.description || ""}
                />
              </FormField>
              <FormField label="Short Description">
                <textarea
                  className="form-input"
                  maxLength={250}
                  placeholder="Brief summary (max 250 characters)"
                  style={{ height: 64 }}
                />
              </FormField>
              <FormRow columns={3}>
                <FormField label="Brand">
                  <input
                    className="form-input"
                    placeholder="Search or add brand…"
                  />
                </FormField>
                <FormField label="Category">
                  <select className="form-select" defaultValue={product?.category}>
                    <option value="">Select category…</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Beauty">Beauty</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </FormField>
                <FormField label="Status">
                  <select className="form-select">
                    <option>Active</option>
                    <option>Draft</option>
                    <option>Archived</option>
                  </select>
                </FormField>
              </FormRow>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === "pt-media" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">Product Media</div>
              <FormField label="Product Images">
                <div className="upload-area">
                  <IconCloudUpload size={28} style={{ display: "block", margin: "0 auto 6px" }} />
                  Drag &amp; drop images here, or click to upload
                  <div className="fg-hint" style={{ marginTop: 4 }}>
                    JPG · PNG · WEBP · AVIF — multiple allowed
                  </div>
                </div>
              </FormField>
              <FormField label="Thumbnail Image">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button type="button" className="btn btn-secondary btn-sm">
                    <IconPhoto size={16} /> Pick Thumbnail
                  </button>
                </div>
              </FormField>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === "pt-pricing" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">Pricing</div>
              <FormRow>
                <FormField label="Selling Price *">
                  <input
                    className="form-input"
                    type="number"
                    placeholder="0.00"
                    defaultValue={product?.price || ""}
                  />
                </FormField>
                <FormField label="Currency">
                  <select className="form-select">
                    <option>USD ($)</option>
                    <option>SGD (S$)</option>
                    <option>EUR (€)</option>
                  </select>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Tax Class">
                  <select className="form-select">
                    <option>Standard</option>
                    <option>Reduced</option>
                    <option>Zero-rated</option>
                  </select>
                </FormField>
                <FormField label="Unit Price">
                  <input className="form-input" placeholder="e.g. $2.00 / 100ml" />
                </FormField>
              </FormRow>
              <FormRow style={{ marginBottom: 0 }}>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <div className="switch-track"></div>
                  <span className="switch-label">Taxable</span>
                </label>
              </FormRow>
            </div>
          )}

          {/* Shipping Tab */}
          {activeTab === "pt-shipping" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">Shipping &amp; Delivery</div>
              <FormRow style={{ marginBottom: 14 }}>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <div className="switch-track"></div>
                  <span className="switch-label">Physical Product</span>
                </label>
                <label className="switch">
                  <input type="checkbox" />
                  <div className="switch-track"></div>
                  <span className="switch-label">Free Shipping</span>
                </label>
              </FormRow>
              <FormRow columns={3}>
                <FormField label="Weight">
                  <input className="form-input" type="number" placeholder="0" />
                </FormField>
                <FormField label="Weight Unit">
                  <select className="form-select">
                    <option>kg</option>
                    <option>g</option>
                    <option>lb</option>
                  </select>
                </FormField>
                <FormField label="Package Type">
                  <select className="form-select">
                    <option>Box</option>
                    <option>Envelope</option>
                    <option>Custom</option>
                  </select>
                </FormField>
              </FormRow>
            </div>
          )}

          {/* Variants Tab */}
          {activeTab === "pt-variants" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">Product Options</div>
              <div className="opt-row mb-4">
                <FormField label="Option Name" style={{ width: 190 }}>
                  <select className="form-select">
                    <option>Size</option>
                    <option>Color</option>
                    <option>Material</option>
                  </select>
                </FormField>
                <FormField label="Option Values" style={{ flex: 1 }}>
                  <div className="tag-input-wrap">
                    <input type="text" placeholder="Type a value, press Enter" />
                  </div>
                </FormField>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon"
                  style={{ marginTop: 25 }}
                >
                  <IconTrash size={16} />
                </button>
              </div>
              <button type="button" className="btn btn-secondary btn-sm">
                <IconPlus size={16} /> Add Option
              </button>

              <div className="sec-label mt-6">Variants</div>
              <div className="var-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Variant</th>
                      <th>SKU</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon"
                        >
                          <IconPhoto size={16} />
                        </button>
                      </td>
                      <td>
                        <input
                          className="form-input"
                          placeholder="e.g. Red / L"
                          style={{ width: 120 }}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          placeholder="SKU"
                          style={{ width: 100 }}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          type="number"
                          placeholder="0.00"
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          type="number"
                          placeholder="0"
                          style={{ width: 64 }}
                        />
                      </td>
                      <td>
                        <select className="form-select" style={{ width: 98 }}>
                          <option>Active</option>
                          <option>Draft</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm btn-icon"
                        >
                          <IconTrash size={16} />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-secondary btn-sm mt-3">
                <IconPlus size={16} /> Add Variant
              </button>
            </div>
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <button className="btn btn-ghost btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                toast.success(
                  isEditing ? "Product updated" : "Product added"
                );
                onClose();
              }}
            >
              <IconCheck size={16} />
              {isEditing ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
