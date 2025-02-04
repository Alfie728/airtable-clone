"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  Clock,
  HelpCircle,
  Loader2,
  LogOut,
  UserCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { CreateBaseModal } from "~/components/base/CreateBaseModal";
import { getUserBases } from "~/app/_actions/bases";
import { useBase } from "~/context/BaseContext";
import type { Base } from "~/types/base";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SignInButton, SignOutButton, useAuth, useUser } from "@clerk/nextjs";

interface TopNavigationProps {
  baseName?: string;
}

export function TopNavigation({
  baseName = "Untitled Base",
}: TopNavigationProps) {
  const [bases, setBases] = useState<Base[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentBase, switchBase } = useBase();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const loadBases = async () => {
      if (!isSignedIn) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const userBases = await getUserBases();
        setBases(userBases);
      } catch (error) {
        console.error("Failed to load bases:", error);
        setError("Failed to load bases");
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded) {
      void loadBases();
    }
  }, [isSignedIn, isLoaded]);

  const handleBaseSwitch = async (baseId: string) => {
    try {
      await switchBase(baseId);
    } catch (error) {
      console.error("Failed to switch base:", error);
    }
  };

  return (
    <nav className="flex items-center border-b px-4 py-2">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          {!isLoaded ? (
            <Button variant="ghost" className="gap-2 font-semibold">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </Button>
          ) : !isSignedIn ? (
            <SignInButton mode="modal">
              <Button>Sign in to create bases</Button>
            </SignInButton>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 font-semibold">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    (currentBase?.name ?? baseName)
                  )}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {isLoading ? (
                  <DropdownMenuItem disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading bases...
                  </DropdownMenuItem>
                ) : error ? (
                  <DropdownMenuItem disabled className="text-red-500">
                    {error}
                  </DropdownMenuItem>
                ) : bases.length === 0 ? (
                  <DropdownMenuItem disabled>No bases found</DropdownMenuItem>
                ) : (
                  <>
                    {bases.map((base) => (
                      <DropdownMenuItem
                        key={base.id}
                        onClick={() => void handleBaseSwitch(base.id)}
                        className="cursor-pointer"
                      >
                        {base.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                <CreateBaseModal />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" disabled={!isSignedIn}>
            Data
          </Button>
          <Button variant="ghost" disabled={!isSignedIn}>
            Automations
          </Button>
          <Button variant="ghost" disabled={!isSignedIn}>
            Interfaces
          </Button>
          <Button variant="ghost" disabled={!isSignedIn}>
            Forms
          </Button>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" disabled={!isSignedIn}>
          <Clock className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" className="gap-2" disabled={!isSignedIn}>
          Share
          <ChevronDown className="h-4 w-4" />
        </Button>
        {isSignedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <UserCircle className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled className="font-medium">
                {user?.fullName ?? user?.emailAddresses[0]?.emailAddress}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <SignOutButton>
                <DropdownMenuItem className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </SignOutButton>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SignInButton mode="modal">
            <Button variant="ghost" size="icon">
              <UserCircle className="h-5 w-5" />
            </Button>
          </SignInButton>
        )}
      </div>
    </nav>
  );
}
