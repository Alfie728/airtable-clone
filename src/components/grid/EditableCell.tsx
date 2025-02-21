"use client";

import { useState, useEffect } from "react";
import type {
  EditableCellProps,
  ColumnDefWithMeta,
  TableMeta,
} from "~/types/grid";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export function EditableCell({
  getValue,
  row,
  column,
  table,
}: EditableCellProps) {
  const initialValue = getValue();
  const columnDef = column as unknown as { columnDef: ColumnDefWithMeta };
  const isNumber = columnDef.columnDef.meta?.type === "number";
  const [value, setValue] = useState<string | number>(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset value when the cell's actual value changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    setIsEditing(false);
    setError(null);

    // Only update if value has changed
    if (value !== initialValue) {
      // Validate number type
      if (isNumber && typeof value === "string") {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          setError("Invalid number");
          setValue(initialValue);
          return;
        }
        setValue(numValue);
      }

      const tableMeta = table.options.meta as TableMeta;
      if (tableMeta?.updateData) {
        tableMeta.updateData(row.index, columnDef.columnDef.id, value);
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
          columnDef.columnDef.id,
          e.shiftKey,
        );
      }
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setValue(initialValue); // Reset to initial value on escape
    } else if (isNumber) {
      // Only allow valid number characters
      if (
        !/^[-\d.]$/.test(e.key) &&
        !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(
          e.key,
        )
      ) {
        e.preventDefault();
        setError("Please enter a number");
      }
    }
  };

  if (!isEditing) {
    return (
      <div
        className="flex h-full w-full cursor-pointer items-center text-sm text-gray-900"
        onClick={() => setIsEditing(true)}
      >
        <span className="truncate">{value}</span>
        {error && (
          <span className="ml-1 text-xs text-red-500" title={error}>
            ⚠️
          </span>
        )}
      </div>
    );
  }

  return (
    <Input
      autoFocus
      value={String(value)}
      onChange={(e) => {
        const newValue = e.target.value;

        if (isNumber) {
          // Only allow valid number characters
          const isValidNumberInput = /^-?\d*\.?\d*$/.test(newValue);
          if (!isValidNumberInput && newValue !== "") {
            setError("Please enter a number");
            return; // Ignore invalid number input
          }
          if (newValue === "") {
            setValue("");
            setError(null);
            return;
          }
          const numValue = Number(newValue);
          if (isNaN(numValue)) {
            setError("Please enter a number");
          } else {
            setError(null);
            setValue(numValue);
          }
        } else {
          setError(null);
          setValue(newValue);
        }
      }}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      type={isNumber ? "number" : "text"}
      placeholder={isNumber ? "Please enter a number" : undefined}
      step="any"
      className={cn(
        "h-[22px] w-full border-0 bg-white p-0 text-sm shadow-[0_0_0_2px_#166BFF] focus:ring-0",
        error && "shadow-[0_0_0_2px_#EF4444]",
      )}
    />
  );
}
