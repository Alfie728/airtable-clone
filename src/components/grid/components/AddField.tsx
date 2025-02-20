"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/keys";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useColumns } from "~/hooks/useColumns";
import { toast } from "sonner";

interface AddFieldProps {
  tableId: string;
  viewId?: string;
  onColumnUpdated: () => void;
}

export function AddField({ tableId, viewId, onColumnUpdated }: AddFieldProps) {
  const { addColumn, isAddingColumn } = useColumns(tableId, viewId);

  const handleAddColumn = async () => {
    try {
      await addColumn({
        name: "Field",
        type: "text",
        defaultValue: "",
      });
      toast.success("Column added successfully");
      onColumnUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add column",
      );
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleAddColumn}
      disabled={isAddingColumn}
      className="h-8 gap-2 text-xs hover:bg-gray-50"
    >
      {isAddingColumn ? (
        "Adding..."
      ) : (
        <>
          <Plus className="h-3.5 w-3.5" />
          Add field
        </>
      )}
    </Button>
  );
}
