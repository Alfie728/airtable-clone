"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "~/lib/utils";
import type { TableRenameResponse } from "~/types/table";

interface EditableTableNameProps {
  name: string;
  isEditing: boolean;
  onRename: (newName: string) => Promise<TableRenameResponse>;
  onEditingChange: (isEditing: boolean) => void;
  className?: string;
}

export function EditableTableName({
  name,
  isEditing,
  onRename,
  onEditingChange,
  className,
}: EditableTableNameProps) {
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditedName(name);
  }, [name]);

  const handleSubmit = async () => {
    if (editedName.trim() && editedName !== name) {
      const result = await onRename(editedName);
      if (!result.success) {
        setEditedName(name);
      }
    }
    onEditingChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleSubmit();
    } else if (e.key === "Escape") {
      setEditedName(name);
      onEditingChange(false);
    }
  };

  if (!isEditing) {
    return <span className={cn("truncate", className)}>{name}</span>;
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={editedName}
      onChange={(e) => setEditedName(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none",
        className,
      )}
    />
  );
}
