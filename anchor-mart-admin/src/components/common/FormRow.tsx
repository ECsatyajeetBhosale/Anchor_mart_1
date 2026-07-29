import { cn } from "@/lib/utils";
import type * as React from "react";

export interface FormRowProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
  style?: React.CSSProperties;
}

export function FormRow({ children, columns = 2, className, style }: FormRowProps) {
  const columnClass = columns === 3 ? "triple" : columns === 1 ? "single" : "";
  return (
    <div className={cn("form-row", columnClass, className)} style={style}>
      {children}
    </div>
  );
}

export default FormRow;
