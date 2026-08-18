import { cn } from "@/lib/utils";
import * as React from "react";

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({ value: "", onValueChange: () => {} });

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
  }
>(({ className, value, defaultValue, onValueChange, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "");
  const isControlled = value !== undefined;

  const currentValue = isControlled ? value : uncontrolledValue;
  const handleValueChange = (v: string) => {
    if (!isControlled) setUncontrolledValue(v);
    if (onValueChange) onValueChange(v);
  };

  return (
    <TabsContext.Provider
      value={{ value: currentValue as string, onValueChange: handleValueChange }}
    >
      <div ref={ref} className={className} {...props} />
    </TabsContext.Provider>
  );
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex border-b-[1.5px] border-[var(--border-sm)] mb-5", className)}
      {...props}
    />
  ),
);
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = React.useContext(TabsContext);
  const isSelected = selectedValue === value;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      onClick={() => onValueChange(value)}
      className={cn(
        "px-[18px] py-[12px] text-[13.5px] font-bold text-[var(--t3)] cursor-pointer border-b-2 border-transparent -mb-[1.5px] transition-all hover:text-[var(--t1)] data-[state=active]:text-[var(--teal-600)] data-[state=active]:border-[var(--teal-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal-500)] outline-none bg-transparent",
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const { value: selectedValue } = React.useContext(TabsContext);
  if (selectedValue !== value) return null;
  return (
    <div
      ref={ref}
      role="tabpanel"
      data-state={selectedValue === value ? "active" : "inactive"}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal-500)] focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
