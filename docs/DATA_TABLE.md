# DataTable Component Documentation

## Overview

The `DataTable` component is a reusable, feature-rich table component built on top of the ShadCN Table component. It provides a unified way to display tabular data across the application with built-in support for pagination, loading states, error handling, and empty states.

**Location:** `/src/components/ui/data-table.tsx`

## Features

✅ **Flexible Column Configuration** - Define columns with custom cell renderers
✅ **Built-in Pagination** - Integrated pagination controls with page navigation
✅ **Loading States** - Animated skeleton rows during data fetching
✅ **Error Handling** - Error display with retry functionality
✅ **Empty States** - Contextual messages for empty data and filtered results
✅ **Responsive Design** - Horizontal scrolling on mobile, sticky headers
✅ **Dark Mode Support** - Full dark mode compatibility
✅ **Accessibility** - Semantic HTML and ARIA labels
✅ **Type-Safe** - Full TypeScript support with generics

## Installation

The component is already installed and ready to use. It depends on:
- ShadCN Table component (`@/components/ui/table`)
- Lucide React icons
- Tailwind CSS

## Usage

### Basic Example

```tsx
import { DataTable, type Column } from "@/components/ui/data-table";

interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
}

function UserTable({ users, isLoading, page, pages, total, limit, onPageChange, onLimitChange }) {
  const columns: Column<User>[] = [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
    },
    {
      id: "email",
      header: "Email",
      accessorKey: "email",
    },
    {
      id: "status",
      header: "Status",
      cell: (user) => (
        <span className={user.status === "active" ? "text-green-600" : "text-gray-600"}>
          {user.status}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      isLoading={isLoading}
      page={page}
      pages={pages}
      total={total}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
    />
  );
}
```

### Advanced Example with Actions

```tsx
const columns: Column<Category>[] = [
  {
    id: "name",
    header: "Name",
    cell: (category) => (
      <div className="flex items-center gap-2">
        <img
          src={category.image}
          alt={category.name}
          className="w-8 h-8 rounded object-cover"
        />
        <span className="font-medium">{category.name}</span>
      </div>
    ),
  },
  {
    id: "description",
    header: "Description",
    cell: (category) => (
      <span className="text-muted-foreground">
        {category.description.substring(0, 50)}...
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    headerClassName: "text-right",
    className: "text-right",
    cell: (category) => (
      <div className="flex items-center justify-end gap-1">
        <Button onClick={() => handleEdit(category)} variant="ghost" size="icon-sm">
          <EditIcon className="size-3.5" />
        </Button>
        <Button onClick={() => handleDelete(category)} variant="ghost" size="icon-sm">
          <TrashIcon className="size-3.5" />
        </Button>
      </div>
    ),
  },
];
```

## API Reference

### DataTable Props

```typescript
interface DataTableProps<T> {
  // Required
  columns: Column<T>[];           // Column definitions
  data: T[];                      // Array of data to display

  // Loading & Error States
  isLoading?: boolean;            // Show skeleton loading state
  isError?: boolean;              // Show error state
  error?: string | null;          // Error message to display
  onRetry?: () => void;           // Retry callback for errors

  // Filtering
  hasActiveFilters?: boolean;     // Show filtered empty state
  onResetFilters?: () => void;    // Reset filters callback

  // Messages
  emptyMessage?: string;          // Message when no data (default: "No records found")
  filteredEmptyMessage?: string;  // Message when filtered (default: "No records match your filters")

  // Pagination
  page?: number;                  // Current page (1-indexed)
  pages?: number;                 // Total number of pages
  total?: number;                 // Total record count
  limit?: number;                 // Records per page
  onPageChange?: (page: number) => void;      // Page change callback
  onLimitChange?: (limit: number) => void;    // Page size change callback
  showPagination?: boolean;       // Show pagination controls (default: true)
  skeletonRowCount?: number;      // Number of skeleton rows (default: 5)
}
```

### Column Definition

```typescript
interface Column<T> {
  id: string;                           // Unique column identifier
  header: string;                       // Column header text
  accessorKey?: keyof T;                // Data key (for simple columns)
  cell?: (row: T) => React.ReactNode;   // Custom cell renderer
  className?: string;                   // Cell CSS classes
  headerClassName?: string;             // Header CSS classes
}
```

## States

### Loading State
Displays animated skeleton rows while data is being fetched.

```tsx
<DataTable
  columns={columns}
  data={[]}
  isLoading={true}
/>
```

### Error State
Displays error message with optional retry button.

```tsx
<DataTable
  columns={columns}
  data={[]}
  isError={true}
  error="Failed to load data"
  onRetry={() => refetch()}
/>
```

### Empty State
Displays contextual message when no data is available.

```tsx
<DataTable
  columns={columns}
  data={[]}
  emptyMessage="No records found"
/>
```

### Filtered Empty State
Displays different message when filters are active but no results match.

```tsx
<DataTable
  columns={columns}
  data={[]}
  hasActiveFilters={true}
  filteredEmptyMessage="No records match your filters"
  onResetFilters={() => resetFilters()}
/>
```

## Pagination

The DataTable includes built-in pagination with:
- Previous/Next navigation buttons
- Page number buttons (shows up to 5 consecutive pages)
- Items per page selector (10, 20, 50, 100)
- Record count display ("Showing X to Y of Z")

```tsx
<DataTable
  columns={columns}
  data={categories}
  page={currentPage}
  pages={totalPages}
  total={totalRecords}
  limit={pageSize}
  onPageChange={(newPage) => setPage(newPage)}
  onLimitChange={(newLimit) => setLimit(newLimit)}
  showPagination={true}
/>
```

## Styling

The component uses Tailwind CSS and respects the application's theme:
- **Colors:** Uses semantic color tokens (foreground, muted-foreground, border, etc.)
- **Dark Mode:** Automatically adapts to dark mode
- **Responsive:** Horizontal scroll on mobile, full width on desktop
- **Spacing:** Consistent padding and gaps

### Custom Styling

You can customize cell and header styling using the `className` and `headerClassName` props:

```tsx
const columns: Column<User>[] = [
  {
    id: "name",
    header: "Name",
    headerClassName: "text-left font-bold",
    className: "text-sm font-medium",
    accessorKey: "name",
  },
];
```

## Real-World Example: Categories Table

The Categories page uses the DataTable component:

```tsx
// src/features/catalog/components/CategoriesTable.tsx
export function CategoriesTable({
  categories,
  isLoading,
  isError,
  error,
  onRetry,
  onViewDetails,
  onEdit,
  hasActiveFilters,
  onResetFilters,
  page,
  pages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: CategoriesTableProps) {
  const columns: Column<Category>[] = [
    {
      id: "name",
      header: "Name",
      cell: (category) => (
        <div className="flex items-center gap-2">
          <img src={category.image} alt={category.name} className="w-8 h-8 rounded" />
          <span className="font-medium">{category.name}</span>
        </div>
      ),
    },
    // ... more columns
  ];

  return (
    <DataTable
      columns={columns}
      data={categories}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={onRetry}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={onResetFilters}
      page={page}
      pages={pages}
      total={total}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
    />
  );
}
```

## Migration Guide

### From Manual Table Implementation

**Before:**
```tsx
<div className="overflow-x-auto">
  <table className="w-full text-xs">
    <thead className="bg-muted border-b border-border">
      <tr>
        <th className="px-3 py-2">Name</th>
        {/* ... */}
      </tr>
    </thead>
    <tbody>
      {items.map(item => (
        <tr key={item.id}>
          <td className="px-3 py-2">{item.name}</td>
          {/* ... */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**After:**
```tsx
<DataTable
  columns={columns}
  data={items}
  page={page}
  pages={pages}
  total={total}
  limit={limit}
  onPageChange={onPageChange}
  onLimitChange={onLimitChange}
/>
```

## Best Practices

1. **Define columns outside render** - Define column configurations outside the component to avoid recreating them on every render
2. **Use cell renderers for complex content** - Use the `cell` prop for custom rendering instead of trying to format data in the column definition
3. **Handle loading states** - Always provide `isLoading` state to show skeleton rows during data fetching
4. **Provide meaningful messages** - Customize `emptyMessage` and `filteredEmptyMessage` for better UX
5. **Implement pagination** - Always pass pagination props when dealing with large datasets
6. **Type your data** - Use TypeScript interfaces for your data to get full type safety

## Accessibility

The DataTable component includes:
- Semantic HTML (`<table>`, `<thead>`, `<tbody>`, etc.)
- ARIA labels on pagination controls
- Keyboard navigation support
- Proper heading hierarchy
- Color contrast compliance

## Performance

- **Virtualization:** For very large datasets (1000+ rows), consider implementing virtual scrolling
- **Memoization:** Column definitions are memoized to prevent unnecessary re-renders
- **Pagination:** Built-in pagination reduces DOM nodes for large datasets

## Troubleshooting

### Table not showing data
- Ensure `data` array is not empty
- Check that `columns` are properly defined with `id` and `header`
- Verify `accessorKey` matches your data structure

### Pagination not working
- Ensure `onPageChange` and `onLimitChange` callbacks are provided
- Check that `page`, `pages`, `total`, and `limit` props are correctly set
- Verify `showPagination` is not set to `false`

### Styling issues
- Check that Tailwind CSS is properly configured
- Verify theme colors are defined in your CSS variables
- Use browser DevTools to inspect applied classes

## Future Enhancements

Potential improvements for the DataTable component:
- Column sorting
- Column filtering
- Row selection with checkboxes
- Expandable rows
- Column resizing
- Export to CSV/Excel
- Inline editing
- Virtual scrolling for large datasets
