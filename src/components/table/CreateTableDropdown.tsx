import { Plus, ChevronRight, FileSpreadsheet, Book } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import Image from "next/image";

interface CreateTableDropdownProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTable: () => void;
  tablesCount: number;
}

export function CreateTableDropdown({
  isOpen,
  onOpenChange,
  onCreateTable,
  tablesCount,
}: CreateTableDropdownProps) {
  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative gap-1 rounded-none bg-[#575C65] px-3 text-[13px] font-normal leading-[18px] text-[rgba(255,255,255,0.85)] hover:text-[rgba(255,255,255,0.95)]"
          asChild
        >
          <div>
            <Plus className="h-3.5 w-3.5" />
            Add or import
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px]" align="start">
        <div className="p-2">
          <div className="mb-4">
            <h3 className="px-2 text-sm font-medium text-gray-900">
              Add a blank table
            </h3>
            <DropdownMenuItem
              className="mt-1 gap-2"
              onSelect={(e) => {
                e.preventDefault();
                onCreateTable();
              }}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">Start from scratch</span>
              </div>
            </DropdownMenuItem>
          </div>

          <div className="mb-2">
            <h3 className="px-2 text-sm font-medium text-gray-900">
              Add from other sources
            </h3>
            <DropdownMenuItem className="mt-1 gap-2" disabled>
              <Image
                width={20}
                height={20}
                src="https://www.airtable.com/images/icons/airtable-icon.svg"
                alt="Airtable"
                className="h-5 w-5"
              />
              <div className="flex flex-1 items-center justify-between">
                <span>Airtable base</span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                  Team
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" disabled>
              <FileSpreadsheet className="h-5 w-5" />
              <span>CSV file</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" disabled>
              <Image
                width={20}
                height={20}
                src="/images/google-calendar-icon.png"
                alt="Google Calendar"
                className="h-5 w-5"
              />
              <div className="flex flex-1 items-center justify-between">
                <span>Google Calendar</span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                  Team
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" disabled>
              <Image
                width={20}
                height={20}
                src="https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_spreadsheet_x16.png"
                alt="Google Sheets"
                className="h-5 w-5"
              />
              <span>Google Sheets</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" disabled>
              <FileSpreadsheet className="h-5 w-5" />
              <span>Microsoft Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" disabled>
              <Image
                width={20}
                height={20}
                src="https://www.salesforce.com/favicon.ico"
                alt="Salesforce"
                className="h-5 w-5"
              />
              <div className="flex flex-1 items-center justify-between">
                <span>Salesforce</span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                  Business
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" disabled>
              <Book className="h-5 w-5" />
              <div className="flex flex-1 items-center justify-between">
                <span>23 more sources...</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
