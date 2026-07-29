import type React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface TabDefinition {
  label: string;
  value: string;
  content?: React.ReactNode;
}

export interface DynamicTabsProps {
  tabs: TabDefinition[];
  defaultValue?: string;
  value?: string;
  onTabChange?: (value: string) => void;
  /** Applied to the `Tabs` root. */
  className?: string;
  /**
   * Applied to the tab bar itself. The bar ships with its own bottom border and
   * `mb-5`; pass `!mb-0` here (not via `className`) when the tabs need to sit
   * flush against whatever follows — `className` lands on the root, which has
   * no margin of its own to override.
   */
  listClassName?: string;
  triggerClassName?: string;
}

export function DynamicTabs({
  tabs,
  defaultValue,
  value,
  onTabChange,
  className,
  listClassName,
  triggerClassName,
}: DynamicTabsProps) {
  if (!tabs || tabs.length === 0) return null;

  return (
    <Tabs
      defaultValue={defaultValue || tabs[0].value}
      value={value}
      onValueChange={onTabChange}
      className={className}
    >
      <TabsList className={listClassName}>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className={triggerClassName}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) =>
        // Only render TabsContent if content is provided
        tab.content ? (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ) : null,
      )}
    </Tabs>
  );
}
