import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
}

interface AuthState {
  authenticated: boolean;
  user: AuthUser | null;
}

export function useAuth() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<AuthState>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) return { authenticated: false, user: null };
      return (await res.json()) as AuthState;
    },
    staleTime: 60 * 1000,
  });

  const login = () => {
    window.location.href = "/api/auth/google";
  };

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    await qc.invalidateQueries({ queryKey: ["auth-user"] });
  };

  return {
    isLoading,
    isAuthenticated: data?.authenticated ?? false,
    user: data?.user ?? null,
    login,
    logout,
  };
}
