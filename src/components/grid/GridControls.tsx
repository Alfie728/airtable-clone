"use client";

import {
  Filter,
  Group,
  SortAsc,
  Palette,
  Menu,
  Share2,
  Search,
  ChevronDown,
  Eye,
  Grid,
  Users,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { UserGroupsIcon, RowHeightIcon } from "~/components/Icons";

interface GridControlsProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function GridControls({
  isSidebarOpen,
  onToggleSidebar,
}: GridControlsProps) {
  return (
    <div className="flex h-12 items-center gap-2 border-b border-gray-200 bg-white px-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        onClick={onToggleSidebar}
      >
        <Menu className="h-4 w-4" />
        Views
      </Button>
      <div className="h-4 w-px bg-gray-200" />
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Grid className="h-4 w-4" />
          Grid view
          <UserGroupsIcon className="h-4 w-4" />
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Eye className="h-4 w-4" />
          Hide fields
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Filter className="h-4 w-4" />
          Filter
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Group className="h-4 w-4" />
          Group
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <SortAsc className="h-4 w-4" />
          Sort
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Palette className="h-4 w-4" />
          Color
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <RowHeightIcon className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Share2 className="h-4 w-4" />
          Share and sync
        </Button>
      </div>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
