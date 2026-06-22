import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, UserRole } from "../../shared/types";

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (role: UserRole, userId?: number) => Promise<User>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      login: async (role, userId) => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, userId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        set({ user: data.user });
        return data.user;
      },
 logout: () => set({ user: null }),
    }),
    { name: "auth-store" }
  )
);
