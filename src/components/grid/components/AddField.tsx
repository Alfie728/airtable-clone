"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/keys";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useColumns } from "~/hooks/useColumns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface AddFieldProps {
  tableId: string;
  viewId?: string;
  onColumnUpdated: () => void;
}

export function AddField({ tableId, viewId, onColumnUpdated }: AddFieldProps) {
  const { addColumn, isAddingColumn } = useColumns(tableId, viewId);
  const [isOpen, setIsOpen] = useState(false);

  const handleAddColumn = async (type: "text" | "number") => {
    try {
      await addColumn({
        name: "Field",
        type,
        defaultValue: type === "number" ? "0" : "",
      });
      toast.success("Column added successfully");
      onColumnUpdated();
      setIsOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add column",
      );
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuItem
          onClick={() => handleAddColumn("text")}
          className="gap-2 text-xs"
        >
          <span className="font-medium">Text</span>
          <span className="text-gray-500">- For text and symbols</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleAddColumn("number")}
          className="gap-2 text-xs"
        >
          <span className="font-medium">Number</span>
          <span className="text-gray-500">- For numeric values</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
