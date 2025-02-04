"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface Base {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date | null;
}

interface BaseContextType {
  currentBase: Base | null;
  setCurrentBase: (base: Base | null) => void;
  switchBase: (baseId: string) => Promise<void>;
}

const BaseContext = createContext<BaseContextType | undefined>(undefined);

export function BaseProvider({ children }: { children: ReactNode }) {
  const [currentBase, setCurrentBase] = useState<Base | null>(null);
  const router = useRouter();

  const switchBase = async (baseId: string) => {
    try {
      const response = await fetch(`/api/bases/${baseId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch base");
      }
      const base = await response.json();
      setCurrentBase(base);
      router.push(`/base/${baseId}`);
    } catch (error) {
      console.error("Error switching base:", error);
      throw error;
    }
  };

  return (
    <BaseContext.Provider
      value={{
        currentBase,
        setCurrentBase,
        switchBase,
      }}
    >
      {children}
    </BaseContext.Provider>
  );
}

export function useBase() {
  const context = useContext(BaseContext);
  if (context === undefined) {
    throw new Error("useBase must be used within a BaseProvider");
  }
  return context;
}
