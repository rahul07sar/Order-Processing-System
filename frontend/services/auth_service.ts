/**
 * Browser-side auth helpers for session-aware UI.
 */
import { SessionUser } from "./storefront_types";

const API_BASE_PATH = "/api";

export async function fetchCurrentUser(): Promise<SessionUser | null> {
  const response = await fetch(`${API_BASE_PATH}/auth/me`, {
    credentials: "include"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SessionUser;
}

export function emitAuthChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("ops-auth-changed"));
}

export async function logoutCurrentUser(): Promise<void> {
  await fetch(`${API_BASE_PATH}/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
  emitAuthChanged();
}
