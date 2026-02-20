import { createClient } from "./server";

export type AppRole = "admin" | "supervisor";

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return userId ?? null;
}

export async function getCurrentUserRole(): Promise<AppRole | null> {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  return (role?.role as AppRole | undefined) ?? null;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === "admin";
}

export async function isCurrentUserSupervisor(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === "supervisor";
}
