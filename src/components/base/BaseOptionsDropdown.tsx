import {
  Pencil,
  Share2,
  Copy,
  ArrowRight,
  Users2,
  Palette,
  MessageSquare,
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
import { DeleteBaseDialog } from "./DeleteBaseDialog";
import { useState, useRef, useLayoutEffect } from "react";

interface BaseOptionsDropdownProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  isRenaming: boolean;
  editedBaseName: string;
  onEditedBaseNameChange: (name: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  baseName: string;
  baseId: string;
  triggerRef: React.RefObject<HTMLAnchorElement>;
}

export function BaseOptionsDropdown({
  isOpen,
  onOpenChange,
  onRename,
  isRenaming,
  editedBaseName,
  onEditedBaseNameChange,
  onRenameSubmit,
  onRenameCancel,
  onKeyDown,
  baseName,
  baseId,
  triggerRef,
}: BaseOptionsDropdownProps) {
  const [alignOffset, setAlignOffset] = useState(0);
  const chevronButtonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current && chevronButtonRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const chevronRect = chevronButtonRef.current.getBoundingClientRect();
      const offset = chevronRect.left - triggerRect.left;
      setAlignOffset(-offset);
    }
  }, [isOpen, triggerRef]);

  if (isRenaming) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={chevronButtonRef}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-[rgba(0,0,0,0.15)]"
          >
            <ChevronDown className="h-4 w-4 text-white" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          alignOffset={alignOffset}
          className="w-[400px] p-4"
          sideOffset={10}
        >
          <div className="mb-2 text-sm font-medium text-gray-700">
            What should this base be called?
          </div>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Input
                value={editedBaseName}
                onChange={(e) => onEditedBaseNameChange(e.target.value)}
                onKeyDown={onKeyDown}
                className="h-9 pr-8 text-sm"
                placeholder="Base name"
                autoFocus
              />
              <HelpCircle className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
          ref={chevronButtonRef}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-[rgba(0,0,0,0.15)]"
        >
          <ChevronDown className="h-4 w-4 text-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        alignOffset={alignOffset}
        sideOffset={10}
        className="w-[220px]"
      >
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onRename();
          }}
        >
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
        <DeleteBaseDialog baseId={baseId} baseName={baseName}>
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
  );
}
