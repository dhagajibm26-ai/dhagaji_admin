"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/useAuthStore";
import type { UserRole } from "@/types";

/**
 * Syncs the next-auth session into the Zustand auth store on mount
 * and whenever the session changes. Renders nothing.
 */
export function SessionSync() {
  const { data: session, status } = useSession();
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const { id, name, role } = session.user as {
        id: string;
        name: string;
        role: UserRole;
      };
      setUser({ id: id ?? "", name: name ?? "", role });
    } else if (status === "unauthenticated") {
      clearUser();
    }
  }, [session, status, setUser, clearUser]);

  return null;
}
