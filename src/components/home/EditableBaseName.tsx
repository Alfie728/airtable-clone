"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "~/lib/utils";
import { useRouter } from "next/navigation";
import type { BaseResponse } from "~/types/base";
import { getDefaultView } from "~/lib/actions/views.action";
import { getTables } from "~/lib/actions/tables.action";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/keys";
import type { SerializedTable } from "~/types/table";

interface EditableBaseNameProps {
  name: string;
  isEditing: boolean;
  onRename: (newName: string) => Promise<BaseResponse>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditedName(name);
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseId || editedName.trim() === "") return;

    try {
      setIsSubmitting(true);
      const result = await onRename(editedName);
      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Base renamed successfully");

      // Get the first table's default view
      const tablesResult = await getTables(baseId);
      if (!tablesResult.success || !tablesResult.tables?.length) {
        router.push("/");
        return;
      }

      const firstTable = tablesResult.tables[0];
      if (!firstTable?.id) {
        throw new Error("Invalid table data");
      }

      const { viewId, error } = await getDefaultView(firstTable.id);
      if (!viewId) {
        throw new Error(error ?? "Failed to get default view");
      }

      router.push(`/${baseId}/${firstTable.id}/${viewId}`);
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Failed to rename base";
      console.error("Error renaming base:", error);
      toast.error(error);
      setEditedName(name);
    } finally {
      setIsSubmitting(false);
      onEditingChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleSubmit(e);
    } else if (e.key === "Escape") {
      setEditedName(name);
      onEditingChange(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing && baseId) {
      e.preventDefault();
      void (async () => {
        try {
          // Get cached tables data
          const tablesResult = queryClient.getQueryData<{
            success: boolean;
            tables: SerializedTable[];
          }>(queryKeys.bases.tables.list(baseId));

          if (!tablesResult?.success || !tablesResult.tables?.length) {
            router.push("/");
            return;
          }

          const firstTable = tablesResult.tables[0];
          if (!firstTable?.id) {
            throw new Error("Invalid table data");
          }

          // Check for cached view first
          const cachedView = queryClient.getQueryData<string>(
            queryKeys.tables.views.list(firstTable.id),
          );

          if (cachedView) {
            router.push(`/${baseId}/${firstTable.id}/${cachedView}`);
            return;
          }

          // If no cached view, fetch from server
          const { viewId, error: viewError } = await getDefaultView(
            firstTable.id,
          );
          if (!viewId) {
            throw new Error(viewError ?? "Failed to get default view");
          }

          // Cache the view ID for future use
          queryClient.setQueryData(
            queryKeys.tables.views.list(firstTable.id),
            viewId,
          );

          router.push(`/${baseId}/${firstTable.id}/${viewId}`);
        } catch (err) {
          const error =
            err instanceof Error ? err.message : "Failed to navigate";
          console.error("Error navigating to base:", error);
          toast.error(error);
        }
      })();
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
      disabled={isSubmitting}
      className={cn(
        "w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none",
        isSubmitting && "cursor-not-allowed opacity-50",
        className,
      )}
    />
  );
}
