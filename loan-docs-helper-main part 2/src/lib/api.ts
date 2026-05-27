// Minimal fetch wrapper that points at the AutoNidhi FastAPI backend.
// Configure VITE_API_BASE_URL to override the default.

const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
  // Mock login for dummy users
  if (path === "/api/login") {
    console.log("Mocking login for:", body.email);
    let role = "customer";
    if (body.email.includes("admin")) role = "admin";
    else if (body.email.includes("agent")) role = "agent";
    else if (body.email.includes("accountant")) role = "accountant";
    else if (body.email.includes("staff")) role = "staff";
    
    return {
      user: body.email,
      role: role,
      first_name: role.charAt(0).toUpperCase() + role.slice(1),
      access_token: "mock-token-" + role,
    } as any;
  }
  
  if (path === "/api/signup") {
    return {
      user: body.email,
      role: body.role,
      first_name: body.first_name,
      access_token: "mock-token-new",
    } as any;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as any).error) {
    throw new Error((data as any).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}
