/**
 * Shared authenticated-entry shell used by the login and home pages.
 */
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { SiteHeader } from "./site_header";

type AuthShellMode = "home" | "login";

type SessionUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

type SessionResponse = {
  expires_at: string;
  user: SessionUser;
};

type LoginFormState = {
  email: string;
  password: string;
};

type AuthSessionShellProps = {
  mode: AuthShellMode;
};

const API_BASE_PATH = "/api";
const INITIAL_FORM_STATE: LoginFormState = {
  email: "",
  password: ""
};

function extractErrorMessage(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    Array.isArray(payload.detail)
  ) {
    return payload.detail
      .map((issue) => {
        if (
          issue &&
          typeof issue === "object" &&
          "msg" in issue &&
          typeof issue.msg === "string"
        ) {
          return issue.msg;
        }
        return "Invalid input.";
      })
      .join(" ");
  }

  return "We could not complete the request. Please try again.";
}

async function clearServerSessionCookie(): Promise<void> {
  try {
    await fetch(`${API_BASE_PATH}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch {
    //user can safely logout and login later, even if the server logout request fails. 
    // The cookie will be cleared on the next login attempt.
  }
}

export function AuthSessionShell({ mode }: AuthSessionShellProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [formState, setFormState] = useState<LoginFormState>(INITIAL_FORM_STATE);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || mode !== "login" || typeof window === "undefined") {
      return;
    }

    const registrationMessage = window.sessionStorage.getItem("registration_success_message");
    if (registrationMessage) {
      setSuccessMessage(registrationMessage);
      window.sessionStorage.removeItem("registration_success_message");
    } else {
      setSuccessMessage("");
    }
  }, [mode, mounted]);

  useEffect(() => {
    let isActive = true;

    async function loadCurrentUser() {
      setIsCheckingSession(true);

      try {
        const response = await fetch(`${API_BASE_PATH}/auth/me`, {
          credentials: "include"
        });

        if (!isActive) {
          return;
        }

        if (response.ok) {
          const payload = (await response.json()) as SessionUser;

          if (!isActive) {
            return;
          }

          setCurrentUser(payload);
          setErrorMessage("");
          setSuccessMessage("");

          if (mode === "login") {
            void router.replace("/home");
          }
          return;
        }

        if (response.status === 401) {
          await clearServerSessionCookie();
        }

        if (!isActive) {
          return;
        }

        setCurrentUser(null);
      } catch {
        if (!isActive) {
          return;
        }

        setCurrentUser(null);
        setErrorMessage(
          "We could not verify the current session right now. You can still try signing in."
        );
      } finally {
        if (isActive) {
          setIsCheckingSession(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, [mode, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_PATH}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email: formState.email,
          password: formState.password
        })
      });

      const payload = (await response.json()) as
        | SessionResponse
        | { detail?: string | { msg?: string }[] };

      if (!response.ok) {
        setErrorMessage(extractErrorMessage(payload));
        return;
      }

      const session = payload as SessionResponse;
      setCurrentUser(session.user);
      setSessionExpiresAt(session.expires_at);
      setFormState(INITIAL_FORM_STATE);
      setErrorMessage("");

      if (mode === "login") {
        await router.replace("/home");
      }
    } catch {
      setErrorMessage("The login service is temporarily unavailable. Please try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setErrorMessage("");
    setIsLoggingOut(true);

    try {
      await fetch(`${API_BASE_PATH}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      setCurrentUser(null);
      setSessionExpiresAt(null);
      setFormState(INITIAL_FORM_STATE);
      setSuccessMessage("");
    } catch {
      setErrorMessage("We could not complete logout right now. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  const isDarkMode = mounted && resolvedTheme === "dark";
  const isAuthenticated = currentUser !== null;

  return (
    <main className="auth-page">
      <SiteHeader
        isAuthenticated={isAuthenticated}
        isLogoutPending={isLoggingOut}
        onLogout={isAuthenticated ? () => void handleLogout() : null}
        showLoginLink={mode !== "login"}
      />

      <section className="auth-shell auth-shell-single">
        {/* Account access panel with login and signed-in states. */}
        <div className="auth-panel">
          <div className="auth-panel-header">
            <div>
              <p className="auth-panel-label">{mode === "home" ? "Home Access" : "Login"}</p>
              <h2>{isAuthenticated ? "Customer Session" : "Welcome back"}</h2>
            </div>

            <button
              type="button"
              className="auth-theme-toggle"
              onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            >
              {mounted ? (isDarkMode ? "Light mode" : "Dark mode") : "Theme"}
            </button>
          </div>

          {isCheckingSession ? (
            <div className="auth-loading">
              <div className="auth-loading-dot" />
              <p>Checking for an active secure session...</p>
            </div>
          ) : isAuthenticated && currentUser ? (
            <div className="auth-session-card">
              <div className="auth-session-row">
                <span>Name</span>
                <strong>{currentUser.full_name}</strong>
              </div>
              <div className="auth-session-row">
                <span>Email</span>
                <strong>{currentUser.email}</strong>
              </div>
              <div className="auth-session-row">
                <span>Role</span>
                <strong>{currentUser.role}</strong>
              </div>
              <div className="auth-session-row">
                <span>Account status</span>
                <strong>{currentUser.is_active ? "Active" : "Inactive"}</strong>
              </div>
              <div className="auth-session-row">
                <span>Account created</span>
                <strong>{new Date(currentUser.created_at).toLocaleString()}</strong>
              </div>

              {sessionExpiresAt ? (
                <div className="auth-session-note">
                  Session currently expires at {new Date(sessionExpiresAt).toLocaleString()}.
                </div>
              ) : (
                <div className="auth-session-note">
                  Session verified successfully. User-specific order pages can now build on this state.
                </div>
              )}

              {errorMessage ? (
                <div className="auth-message auth-message-error">{errorMessage}</div>
              ) : null}

              <div className="auth-actions">
                <button
                  type="button"
                  className="auth-secondary-action"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Signing out..." : "Logout"}
                </button>
              </div>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      email: event.target.value
                    }))
                  }
                  placeholder="jane@example.com"
                  required
                />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <input
                  autoComplete="current-password"
                  name="password"
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      password: event.target.value
                    }))
                  }
                  placeholder="Enter your password"
                  required
                />
              </label>

              <p className="auth-helper-copy">
                Your session token stays server-side, is issued through a secure HttpOnly cookie,
                and disappears on logout.
              </p>

              {errorMessage ? (
                <div className="auth-message auth-message-error">{errorMessage}</div>
              ) : null}

              {successMessage ? (
                <div className="auth-message auth-message-success">{successMessage}</div>
              ) : null}

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Login"}
              </button>

              <p className="auth-register-row">
                Not registered yet,{" "}
                <Link className="auth-inline-link" href="/registration">
                  click here to register
                </Link>
                .
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
