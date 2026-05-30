/**
 * useAuthStore.ts — Client-side role store (Zustand v5).
 *
 * Keeps the user's role in client memory so UI components can show/hide
 * owner-only elements (costing, profit) without an extra server round-trip.
 *
 * Source of truth is always next-auth's session; this store is a cache.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@/types";

// ─── State interface ──────────────────────────────────────────────────────────

interface AuthState {
  role: UserRole | null;
  userId: string | null;
  userName: string | null;
  // ── Actions ────────────────────────────────────────────────────────────────
  /** Preferred: update only the role (e.g. from a server action). */
  setRole: (role: UserRole | null) => void;
  /** Convenience: seed all user fields at once (e.g. after sign-in). */
  setUser: (user: { id: string; name: string; role: UserRole }) => void;
  /** Clear on sign-out. */
  clearUser: () => void;
  // ── Legacy computed methods (kept for Sidebar / Header compat) ─────────────
  isOwner: () => boolean;
  isStaff: () => boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      role: null,
      userId: null,
      userName: null,

      setRole: (role) => set({ role }),

      setUser: ({ id, name, role }) =>
        set({ userId: id, userName: name, role }),

      clearUser: () => set({ userId: null, userName: null, role: null }),

      isOwner: () => get().role === "owner",
      isStaff: () => get().role === "staff",
    }),
    { name: "dhagaji-auth" }
  )
);

// ─── Primitive selector hooks — avoids re-renders on unrelated state changes ──

export const useRole = () => useAuthStore((s) => s.role);
export const useSetRole = () => useAuthStore((s) => s.setRole);
export const useIsOwner = () => useAuthStore((s) => s.role === "owner");
export const useIsStaff = () => useAuthStore((s) => s.role === "staff");
