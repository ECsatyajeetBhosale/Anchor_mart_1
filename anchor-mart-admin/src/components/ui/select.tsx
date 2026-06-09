import * as React from "react"
import { IconChevronDown, IconCheck } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

const SelectContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
}>({
  open: false,
  setOpen: () => {},
  value: "",
  onValueChange: () => {},
})

export const Select = ({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(value || "");

  const handleValueChange = (val: string) => {
    setInternalValue(val);
    if (onValueChange) onValueChange(val);
    setOpen(false);
  };

  React.useEffect(() => {
    if (value !== undefined) setInternalValue(value);
  }, [value]);

  return (
    <SelectContext.Provider value={{ open, setOpen, value: internalValue, onValueChange: handleValueChange }}>
      <div className="relative inline-block w-full text-left font-body">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext);
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-[38px] w-full items-center justify-between rounded-[var(--radius-md)] border-[1.5px] border-[var(--border-md)] bg-[var(--surface-input)] px-3 text-[13.5px] font-medium text-[var(--t1)] outline-none transition-colors hover:border-[var(--border-lg)] focus:border-[var(--teal-500)] focus:shadow-[var(--sh-focus-teal)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <IconChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = React.useContext(SelectContext);
  return <span className="truncate">{value || placeholder}</span>
}

export const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open } = React.useContext(SelectContext);
    if (!open) return null;

    return (
      <div className="absolute z-50 mt-1 max-h-72 w-full min-w-[8rem] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--surface)] text-[var(--t1)] shadow-[var(--sh-md)]">
        <div
          ref={ref}
          className={cn("p-1", className)}
          {...props}
        >
          {children}
        </div>
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

export const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className, children, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = React.useContext(SelectContext);
    const isSelected = selectedValue === value;

    return (
      <div
        ref={ref}
        onClick={() => onValueChange(value)}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-[13.5px] font-medium outline-none hover:bg-[var(--surface-alt)] hover:text-[var(--t1)] focus:bg-[var(--surface-alt)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          isSelected ? "bg-[var(--surface-alt)] font-bold text-[var(--navy-900)]" : "text-[var(--t2)]",
          className
        )}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {isSelected && <IconCheck className="h-4 w-4" />}
        </span>
        <span className="truncate">{children}</span>
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"
