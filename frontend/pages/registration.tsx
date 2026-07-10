/**
 * Customer registration page built with the Pages Router convention requested for this repo.
 */
import Head from "next/head";
import { FormEvent, useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { SiteHeader } from "../components/site_header";

type RegistrationFormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegistrationSuccess = {
  user: {
    full_name: string;
    email: string;
    role: string;
  };
  expires_at: string;
};

type RegistrationFieldErrors = {
  password?: string;
  confirmPassword?: string;
};

const INITIAL_FORM_STATE: RegistrationFormState = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: ""
};

const API_BASE_PATH = "/api";

function getPasswordValidationMessage(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character.";
  }

  return null;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const responseText = await response.text();

  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return { detail: responseText };
  }
}

function extractErrorMessage(response: Response, payload: unknown): string {
  if (response.status >= 500) {
    return "The registration service is temporarily unavailable. Please try again in a moment.";
  }

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

  return "We could not complete registration. Please check your details and try again.";
}

export default function RegistrationPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [formState, setFormState] = useState<RegistrationFormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setFieldErrors({});

    if (formState.password !== formState.confirmPassword) {
      setFieldErrors({
        confirmPassword: "Password and confirm password must match."
      });
      return;
    }

    const passwordValidationMessage = getPasswordValidationMessage(formState.password);
    if (passwordValidationMessage) {
      setFieldErrors({
        password: passwordValidationMessage
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_PATH}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          full_name: formState.fullName,
          email: formState.email,
          password: formState.password,
          confirm_password: formState.confirmPassword
        })
      });

      const payload = (await parseResponsePayload(response)) as
        | RegistrationSuccess
        | { detail?: string | { msg?: string }[] };

      if (!response.ok) {
        setErrorMessage(extractErrorMessage(response, payload));
        return;
      }

      await fetch(`${API_BASE_PATH}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      setFormState(INITIAL_FORM_STATE);
      setFieldErrors({});

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("registration_success_message", "User registered successfully.");
        window.location.assign("/login");
        return;
      }
    } catch {
      setErrorMessage(
        "The registration service is currently unavailable. Please try again in a moment."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isDarkMode = mounted && resolvedTheme === "dark";

  return (
    <>
      <Head>
        <title>User Registration | Order Processing System</title>
        <meta
          name="description"
          content="Create a secure customer account for the order processing platform."
        />
      </Head>

      <main className="registration-page">
        <SiteHeader />

        <section className="registration-shell">
          {/* Left-side context block that explains the security posture of this flow. */}
          <div className="registration-hero">
            <p className="registration-eyebrow">USER SERVICE ENTRYPOINT</p>
            <h1>Create your customer account</h1>
            <p className="registration-copy">
              This flow is wired for secure registration with backend validation,
              rate limiting, and an HttpOnly session cookie instead of browser token
              storage.
            </p>

            <div className="registration-badges">
              <span>Rate limited</span>
              <span>Password policy enforced</span>
              <span>Session cookie issued</span>
            </div>
          </div>

          {/* Right-side form panel for account creation. */}
          <div className="registration-panel">
            <div className="registration-panel-header">
              <div>
                <p className="registration-panel-label">Registration</p>
                <h2>Customer Signup</h2>
              </div>

              <button
                type="button"
                className="registration-theme-toggle"
                onClick={() => setTheme(isDarkMode ? "light" : "dark")}
              >
                {mounted ? (isDarkMode ? "Light mode" : "Dark mode") : "Theme"}
              </button>
            </div>

            <form className="registration-form" onSubmit={handleSubmit}>
              {/* Identity fields */}
              <label className="registration-field">
                <span>Full Name</span>
                <input
                  autoComplete="name"
                  name="fullName"
                  type="text"
                  value={formState.fullName}
                  onChange={(event) => {
                    setErrorMessage("");
                    setFormState((current) => ({
                      ...current,
                      fullName: event.target.value
                    }));
                  }}
                  placeholder="Jane Doe"
                  required
                />
              </label>

              {/* Credential fields */}
              <label className="registration-field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={(event) => {
                    setErrorMessage("");
                    setFormState((current) => ({
                      ...current,
                      email: event.target.value
                    }));
                  }}
                  placeholder="jane@example.com"
                  required
                />
              </label>

              <label className="registration-field">
                <span>Password</span>
                <input
                  autoComplete="new-password"
                  name="password"
                  type="password"
                  value={formState.password}
                  onChange={(event) => {
                    setErrorMessage("");
                    setFieldErrors((current) => ({
                      ...current,
                      password: undefined,
                      confirmPassword: undefined
                    }));
                    setFormState((current) => ({
                      ...current,
                      password: event.target.value
                    }));
                  }}
                  placeholder="Use at least 8 characters"
                  required
                />
                {fieldErrors.password ? (
                  <span className="registration-inline-error">{fieldErrors.password}</span>
                ) : null}
              </label>

              <label className="registration-field">
                <span>Confirm Password</span>
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  type="password"
                  value={formState.confirmPassword}
                  onChange={(event) => {
                    setErrorMessage("");
                    setFieldErrors((current) => ({
                      ...current,
                      confirmPassword: undefined
                    }));
                    setFormState((current) => ({
                      ...current,
                      confirmPassword: event.target.value
                    }));
                  }}
                  placeholder="Repeat your password"
                  required
                />
                {fieldErrors.confirmPassword ? (
                  <span className="registration-inline-error">
                    {fieldErrors.confirmPassword}
                  </span>
                ) : null}
              </label>

              <div className="registration-password-hint">
                Use at least 8 characters with uppercase, lowercase, and one
                special character.
              </div>

              {/* Feedback messages are kept close to the submit action for clarity. */}
              {errorMessage ? (
                <div className="registration-message registration-message-error">
                  {errorMessage}
                </div>
              ) : null}

              <button className="registration-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
