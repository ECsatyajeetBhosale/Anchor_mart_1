import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  className?: string;
  triggerClassName?: string;
}

export function DynamicTabs({
  tabs,
  defaultValue,
  value,
  onTabChange,
  className,
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
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className={triggerClassName}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        // Only render TabsContent if content is provided
        tab.content ? (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ) : null
      ))}
    </Tabs>
  );
}
