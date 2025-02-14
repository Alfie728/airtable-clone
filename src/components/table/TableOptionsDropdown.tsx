import {
  Import,
  Pencil,
  Eye,
  Settings2,
  Copy,
  CalendarClock,
  Info,
  Lock,
  XCircle,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { HelpCircle } from "lucide-react";
import { DeleteTableDialog } from "./DeleteTableDialog";
import { useParams } from "next/navigation";
import { useState, useRef, useLayoutEffect } from "react";

interface TableOptionsDropdownProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  isRenaming: boolean;
  editedTableName: string;
  onEditedTableNameChange: (name: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  tableName: string;
  tableId: string;
  tabRef: React.RefObject<HTMLButtonElement>;
}

export function TableOptionsDropdown({
  isOpen,
  onOpenChange,
  onRename,
  isRenaming,
  editedTableName,
  onEditedTableNameChange,
  onRenameSubmit,
  onRenameCancel,
  onKeyDown,
  tableName,
  tableId,
  tabRef,
}: TableOptionsDropdownProps) {
  const params = useParams();
  const baseId = params.baseId as string;
  const [alignOffset, setAlignOffset] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current && tabRef.current) {
      const tabRect = tabRef.current.getBoundingClientRect();
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const offset = triggerRect.left - tabRect.left;
      setAlignOffset(-offset);
    }
  }, [isOpen, tabRef]);

  if (isRenaming) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
            asChild
          >
            <div>
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          alignOffset={alignOffset}
          className="w-[400px] p-4"
          sideOffset={10}
        >
          <div className="mb-2 text-sm font-medium text-gray-700">
            What should each record be called?
          </div>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Input
                value={editedTableName}
                onChange={(e) => onEditedTableNameChange(e.target.value)}
                onKeyDown={onKeyDown}
                className="h-9 pr-8 text-sm"
                placeholder="Record"
                autoFocus
              />
              <HelpCircle className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="text-xs text-gray-500">
              Examples:{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-xs font-normal text-gray-500 hover:text-gray-700"
              >
                Add record
              </Button>{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-xs font-normal text-gray-500 hover:text-gray-700"
              >
                Send records
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-sm"
                onClick={onRenameCancel}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-sm"
                onClick={onRenameSubmit}
              >
                Save
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-transparent"
          asChild
        >
          <div>
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        alignOffset={alignOffset}
        sideOffset={10}
        className="w-[220px]"
      >
        <DropdownMenuItem>
          <Import className="mr-2 h-4 w-4" />
          Import data
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onRename();
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Rename table
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Eye className="mr-2 h-4 w-4" />
          Hide table
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings2 className="mr-2 h-4 w-4" />
          Manage fields
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate table
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <CalendarClock className="mr-2 h-4 w-4" />
          Configure date dependencies
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Info className="mr-2 h-4 w-4" />
          Edit table description
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Lock className="mr-2 h-4 w-4" />
          Edit table permissions
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <XCircle className="mr-2 h-4 w-4" />
          Clear data
        </DropdownMenuItem>
        <DeleteTableDialog
          baseId={baseId}
          tableId={tableId}
          tableName={tableName}
        >
          <DropdownMenuItem
            className="text-red-600 focus:bg-red-50 focus:text-red-600"
            onSelect={(e) => e.preventDefault()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete table
          </DropdownMenuItem>
        </DeleteTableDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
