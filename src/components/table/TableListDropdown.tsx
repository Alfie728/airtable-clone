import { Search, Check, ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "@radix-ui/react-separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import type { tables } from "~/server/db/schema";
import { useState } from "react";

interface TableListDropdownProps {
  tables: Array<typeof tables.$inferSelect>;
  currentTableId?: string | null;
  onTableSelect: (tableId: string) => void;
  onCreateTableClick: () => void;
  onTableOptionsClick: (tableId: string) => void;
}

export function TableListDropdown({
  tables,
  currentTableId,
  onTableSelect,
  onCreateTableClick,
  onTableOptionsClick,
}: TableListDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-none bg-[#575C65] px-3 text-[rgba(255,255,255,0.85)] hover:text-[rgba(255,255,255,0.95)]"
          asChild
        >
          <div>
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[456px] p-0" sideOffset={0}>
        <div className="flex flex-col">
          <div className="border-b border-gray-200 p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Find a table"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full border-0 bg-transparent pl-8 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto py-1">
            {filteredTables.map((table) => (
              <div
                key={table.id}
                className="group flex items-center px-2 hover:bg-gray-50"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex h-9 flex-1 items-center justify-between gap-2 rounded-none px-2 py-1.5 text-[13px] font-normal text-gray-700 hover:bg-transparent"
                  onClick={() => {
                    onTableSelect(table.id);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <div className="flex items-center gap-2">
                    {currentTableId === table.id && (
                      <Check className="h-3.5 w-3.5 text-gray-700" />
                    )}
                    <span className="truncate">{table.name}</span>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-sm p-0 opacity-0 hover:bg-gray-100 group-hover:opacity-100"
                  onClick={() => onTableOptionsClick(table.id)}
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
            ))}
            <Separator className="my-1 h-px w-full bg-gray-200" />
            <div className="p-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex h-9 w-full items-center justify-start gap-2 rounded-none px-3 py-1.5 text-[13px] font-normal text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  onCreateTableClick();
                  setIsOpen(false);
                  setSearchQuery("");
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add table
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
