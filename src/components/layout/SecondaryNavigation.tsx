"use client";

import { ChevronDown, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";

export function SecondaryNavigation() {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="gap-2 font-semibold">
          Table 1
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" className="gap-2">
          <Plus className="h-4 w-4" />
          Add or import
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost">Extensions</Button>
        <Button variant="ghost" className="gap-2">
          Tools
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
