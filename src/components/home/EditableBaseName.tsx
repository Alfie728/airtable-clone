"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "~/lib/utils";
import { useRouter } from "next/navigation";

interface EditableBaseNameProps {
  name: string;
  isEditing: boolean;
  onRename: (newName: string) => Promise<void>;
  onEditingChange: (isEditing: boolean) => void;
  className?: string;
  baseId?: string;
}

export function EditableBaseName({
  name,
  isEditing,
  onRename,
  onEditingChange,
  className,
  baseId,
}: EditableBaseNameProps) {
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      await onRename(editedName);
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

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing && baseId) {
      router.push(`/${baseId}/tables/grid`);
    }
  };

  if (!isEditing) {
    return (
      <span
        onClick={handleClick}
        className={cn(
          "cursor-pointer truncate",
          baseId && "hover:text-blue-600",
          className,
        )}
      >
        {name}
      </span>
    );
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
