"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { listSpaces } from "@/apis/documents";
import type { DocumentSummaryResponse } from "@/types/document";

interface SpacesContextValue {
  tree: DocumentSummaryResponse[];
  loadingTree: boolean;
  setTree: React.Dispatch<React.SetStateAction<DocumentSummaryResponse[]>>;
}

const SpacesContext = React.createContext<SpacesContextValue | null>(null);

export function SpacesProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tree, setTree] = React.useState<DocumentSummaryResponse[]>([]);
  const [loadedSpaces, setLoadedSpaces] = React.useState(false);
  const loadingTree = pathname === "/" && !loadedSpaces;

  React.useEffect(() => {
    let ignore = false;

    if (pathname !== "/") {
      return () => {
        ignore = true;
      };
    }

    listSpaces()
      .then((data) => {
        if (!ignore) setTree(data);
      })
      .catch(() => {
        if (!ignore) setTree([]);
      })
      .finally(() => {
        if (!ignore) setLoadedSpaces(true);
      });

    return () => {
      ignore = true;
    };
  }, [pathname]);

  const value = React.useMemo(() => ({ tree, loadingTree, setTree }), [tree, loadingTree]);

  return <SpacesContext.Provider value={value}>{children}</SpacesContext.Provider>;
}

export function useSpaces() {
  const context = React.useContext(SpacesContext);
  if (!context) {
    throw new Error("useSpaces must be used within a SpacesProvider");
  }
  return context;
}
