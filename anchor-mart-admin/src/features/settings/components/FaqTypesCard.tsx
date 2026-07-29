import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconCheck, IconPlus, IconTag, IconTrash, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateFaqTypeMutation,
  useDeleteFaqTypeMutation,
  useGetFaqTypesQuery,
  useUpdateFaqTypeMutation,
} from "../api/faqApi";

/**
 * FAQ categories. Inline add/rename rather than a drawer — a category is a
 * single field, so a full drawer would be more ceremony than the edit deserves.
 */
export function FaqTypesCard() {
  const { data, isLoading } = useGetFaqTypesQuery();
  const [createType, { isLoading: isCreating }] = useCreateFaqTypeMutation();
  const [updateType] = useUpdateFaqTypeMutation();
  const [deleteType, { isLoading: isDeleting }] = useDeleteFaqTypeMutation();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const types = data?.results ?? [];

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const response = await createType({ name: newName.trim() }).unwrap();
      setNewName("");
      toast.success(getApiMessage(response) ?? MESSAGES.SETTINGS.FAQ_TYPES.TOAST.CREATE_SUCCESS);
    } catch (error) {
      toast.error(getApiMessage(error) ?? MESSAGES.SETTINGS.FAQ_TYPES.TOAST.CREATE_ERROR);
    }
  };

  const handleRename = async (id: number) => {
    if (!editingName.trim()) return;
    try {
      const response = await updateType({ id, body: { name: editingName.trim() } }).unwrap();
      setEditingId(null);
      toast.success(getApiMessage(response) ?? MESSAGES.SETTINGS.FAQ_TYPES.TOAST.UPDATE_SUCCESS);
    } catch (error) {
      toast.error(getApiMessage(error) ?? MESSAGES.SETTINGS.FAQ_TYPES.TOAST.UPDATE_ERROR);
    }
  };

  const handleDelete = async () => {
    if (pendingDelete === null) return;
    try {
      await deleteType(pendingDelete).unwrap();
      setPendingDelete(null);
      toast.success(MESSAGES.SETTINGS.FAQ_TYPES.TOAST.DELETE_SUCCESS);
    } catch (error) {
      setPendingDelete(null);
      toast.error(getApiMessage(error) ?? MESSAGES.SETTINGS.FAQ_TYPES.TOAST.DELETE_ERROR);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <IconTag size={18} className="text-[var(--t3)]" />
        <span className="text-[14.5px] font-extrabold text-[var(--t1)]">
          {MESSAGES.SETTINGS.FAQ_TYPES.TITLE}
        </span>
        <span className="ml-auto text-[11.5px] font-semibold text-[var(--t4)]">
          {types.length} {types.length === 1 ? "category" : "categories"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-[12.5px] text-[var(--t4)]">{MESSAGES.COMMON.LOADING}</p>}

        {types.map((type) => (
          <div
            key={type.id}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-xs)] bg-[var(--surface-alt)] px-3 py-2"
          >
            {editingId === type.id ? (
              <>
                <Input
                  className="h-8 flex-1"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-icon"
                  title={MESSAGES.SETTINGS.FAQ_TYPES.SAVE}
                  onClick={() => handleRename(type.id)}
                >
                  <IconCheck size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-icon"
                  title={MESSAGES.COMMON.CANCEL}
                  onClick={() => setEditingId(null)}
                >
                  <IconX size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="flex-1 text-left text-[13px] font-semibold text-[var(--t2)]"
                  onClick={() => {
                    setEditingId(type.id);
                    setEditingName(type.name);
                  }}
                >
                  {type.name}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-icon text-[var(--danger-icon)]"
                  title={MESSAGES.SETTINGS.FAQ_TYPES.DELETE}
                  onClick={() => setPendingDelete(type.id)}
                >
                  <IconTrash size={14} />
                </button>
              </>
            )}
          </div>
        ))}

        <div className="mt-2 flex items-center gap-2">
          <Input
            className="h-9 flex-1"
            placeholder={MESSAGES.SETTINGS.FAQ_TYPES.ADD_PLACEHOLDER}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAdd}
            disabled={isCreating || !newName.trim()}
          >
            <IconPlus size={14} />
            {MESSAGES.SETTINGS.FAQ_TYPES.ADD}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title={MESSAGES.SETTINGS.FAQ_TYPES.CONFIRM.TITLE}
        description={MESSAGES.SETTINGS.FAQ_TYPES.CONFIRM.DESCRIPTION}
        confirmText={MESSAGES.COMMON.DELETE}
        isLoading={isDeleting}
      />
    </div>
  );
}
