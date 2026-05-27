// Lightweight client-side auth state backed by localStorage.
// Backend stays untouched; this just mirrors what /api/login & /api/signup return.

export type Role = "admin" | "staff" | "accountant" | "data_entry" | "agent" | "customer";

export interface CurrentUser {
  email: string;
  role: Role;
  name: string;
}

const USER_KEY = "an_current_user";
const ROLE_KEY = "user_role";
const TOKEN_KEY = "access_token";

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function setSession(user: CurrentUser, token: string) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ROLE_KEY, user.role);
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(ROLE_KEY) as Role) || null;
}

export function isAdminLike(role: Role | null): boolean {
  return role === "admin" || role === "accountant" || role === "data_entry" || role === "staff";
}
