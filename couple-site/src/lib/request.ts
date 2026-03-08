import { cookies } from "next/headers";

export type SessionInfo = {
  coupleId: string;
  role: "A" | "B";
};

export async function getSessionFromCookies(): Promise<SessionInfo | null> {
  const cookieStore = await cookies();
  const coupleId = cookieStore.get("couple_id")?.value;
  const role = cookieStore.get("role")?.value;
  if (!coupleId) return null;
  if (role !== "A" && role !== "B") return null;
  return { coupleId, role };
}
