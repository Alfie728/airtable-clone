"use client";

import { ChevronDown, Clock, HelpCircle, UserCircle } from "lucide-react";
import { Button } from "~/components/ui/button";

interface TopNavigationProps {
  baseName?: string;
}

export function TopNavigation({
  baseName = "Untitled Base",
}: TopNavigationProps) {
  return (
    <nav className="flex items-center border-b px-4 py-2">
      <div className="flex items-center gap-8">
        <Button variant="ghost" className="gap-2 font-semibold">
          {baseName}
          <ChevronDown className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4">
          <Button variant="ghost">Data</Button>
          <Button variant="ghost">Automations</Button>
          <Button variant="ghost">Interfaces</Button>
          <Button variant="ghost">Forms</Button>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Clock className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" className="gap-2">
          Share
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <UserCircle className="h-5 w-5" />
        </Button>
      </div>
    </nav>
  );
}
