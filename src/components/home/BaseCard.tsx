"use client";

import { useState } from "react";
import Link from "next/link";
import type { SerializedBase } from "~/types/base";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import {
  MoreHorizontal,
  Pencil,
  Share2,
  Copy,
  ArrowRight,
  Users2,
  Palette,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { DeleteBaseDialog } from "~/components/base/DeleteBaseDialog";
import { EditableBaseName } from "~/components/home/EditableBaseName";
import { useBase } from "~/hooks/useBase";
import { toast } from "sonner";

interface BaseCardProps {
  base: SerializedBase;
  onHover?: (baseId: string) => void;
}

export function BaseCard({ base, onHover }: BaseCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { renameBase, isRenaming } = useBase(base.id);

  const handleRename = async (newName: string) => {
    try {
      const result = await renameBase(newName);
      if (result.success) {
        toast.success("Base renamed successfully");
      } else {
        toast.error(result.error ?? "Failed to rename base");
      }
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to rename base";
      toast.error(message);
      throw error;
    }
  };

  return (
    <div
      onMouseEnter={() => onHover?.(base.id)}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex flex-1 flex-col p-6">
        <EditableBaseName
          name={base.name}
          isEditing={isEditing}
          onRename={handleRename}
          onEditingChange={setIsEditing}
          className="text-lg font-semibold text-gray-900 group-hover:text-blue-600"
          baseId={base.id}
        />
        {base.description && (
          <p className="mt-2 text-sm text-gray-500">{base.description}</p>
        )}
        <div className="mt-4 text-xs text-gray-400">
          Created {new Date(base.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuItem onSelect={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename base
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 className="mr-2 h-4 w-4" />
              Share base
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate base
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ArrowRight className="mr-2 h-4 w-4" />
              Move base
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Users2 className="mr-2 h-4 w-4" />
              Go to workspace
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Palette className="mr-2 h-4 w-4" />
              Customize appearance
            </DropdownMenuItem>
            <DropdownMenuItem>
              <MessageSquare className="mr-2 h-4 w-4" />
              Slack notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DeleteBaseDialog baseId={base.id} baseName={base.name}>
              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-600"
                onSelect={(e) => e.preventDefault()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete base
              </DropdownMenuItem>
            </DeleteBaseDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
