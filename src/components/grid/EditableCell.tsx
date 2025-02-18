"use client";

import { useState, useEffect } from "react";
import type {
  EditableCellProps,
  ColumnDefWithMeta,
  TableMeta,
} from "~/types/grid";
import { Input } from "~/components/ui/input";

export function EditableCell({
  getValue,
  row,
  column,
  table,
}: EditableCellProps) {
  const initialValue = getValue();
  const [value, setValue] = useState<string | number>(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  // Reset value when the cell's actual value changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    setIsEditing(false);
    const columnDef = column as ColumnDefWithMeta;

    // Only update if value has changed
    if (value !== initialValue) {
      const tableMeta = table.options.meta as TableMeta;
      if (tableMeta?.updateData) {
        tableMeta.updateData(row.index, columnDef.id, value);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onBlur();
    } else if (e.key === "Tab") {
      e.preventDefault();
      onBlur();
      const tableMeta = table.options.meta as TableMeta;
      if (tableMeta?.handleTabNavigation) {
        tableMeta.handleTabNavigation(
          row.original.id,
          (column as ColumnDefWithMeta).id,
          e.shiftKey,
        );
      }
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setValue(initialValue); // Reset to initial value on escape
    }
  };

  if (!isEditing) {
    return (
      <div
        className="flex h-full w-full cursor-pointer items-center text-sm text-gray-900"
        onClick={() => setIsEditing(true)}
      >
        <span className="truncate">{value}</span>
      </div>
    );
  }

  return (
    <Input
      autoFocus
      value={String(value)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      type={
        (column as ColumnDefWithMeta).meta?.type === "number"
          ? "number"
          : "text"
      }
      className="h-[22px] w-full border-0 bg-white p-0 text-sm shadow-[0_0_0_2px_#166BFF] focus:ring-0"
    />
  );
}
