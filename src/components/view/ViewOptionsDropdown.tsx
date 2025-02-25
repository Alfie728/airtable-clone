import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState } from "react";

interface ViewOptionsDropdownProps {
  viewId: string;
  viewName: string;
  isDefault: boolean;
  onRename: (viewId: string, name: string) => Promise<void>;
  onDelete: (viewId: string) => Promise<void>;
  isRenaming?: boolean;
  isDeleting?: boolean;
}

export function ViewOptionsDropdown({
  viewId,
  viewName,
  isDefault,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
}: ViewOptionsDropdownProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(viewName);
  const [isOpen, setIsOpen] = useState(false);

  const handleRename = async () => {
    if (editedName.trim() === "") return;
    await onRename(viewId, editedName.trim());
    setIsEditing(false);
    setIsOpen(false);
  };

  const handleDelete = async () => {
    await onDelete(viewId);
    setIsOpen(false);
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && isEditing) {
          setEditedName(viewName);
        }
        setIsEditing(false);
        setIsOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
          disabled={isRenaming ?? isDeleting}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[160px]"
        onClick={(e) => e.stopPropagation()}
      >
        {isEditing ? (
          <div className="flex items-center gap-2 p-2">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleRename();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setIsEditing(false);
                  setEditedName(viewName);
                }
              }}
              className="h-8"
              autoFocus
            />
          </div>
        ) : (
          <>
            <DropdownMenuItem
              onSelect={(e: Event) => {
                e.preventDefault();
                handleRenameClick(e as unknown as React.MouseEvent);
              }}
              disabled={isRenaming}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={isDefault || isDeleting}
              className="text-red-600 focus:bg-red-50 focus:text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
