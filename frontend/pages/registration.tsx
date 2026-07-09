/**
 * Customer registration page built with the Pages Router convention requested for this repo.
 */
import Head from "next/head";
import { FormEvent, useEffect, useState } from "react";
import { useTheme } from "next-themes";

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
  confirmPassword?: string;
};

const INITIAL_FORM_STATE: RegistrationFormState = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: ""
};

const API_BASE_PATH = "/api";

function extractErrorMessage(payload: unknown): string {
  // The backend can return either a flat detail string or a structured validation error list.
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
  const [successState, setSuccessState] = useState<RegistrationSuccess | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessState(null);
    setFieldErrors({});

    // Keep the mismatch check on the client for fast feedback before we call the API.
    if (formState.password !== formState.confirmPassword) {
      setFieldErrors({
        confirmPassword: "Password and confirm password must match."
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

      const payload = (await response.json()) as
        | RegistrationSuccess
        | { detail?: string | { msg?: string }[] };

      if (!response.ok) {
        setErrorMessage(extractErrorMessage(payload));
        return;
      }

      // Successful registration also creates the secure session on the backend.
      setSuccessState(payload as RegistrationSuccess);
      setFormState(INITIAL_FORM_STATE);
      setFieldErrors({});
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
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      fullName: event.target.value
                    }))
                  }
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

              <label className="registration-field">
                <span>Password</span>
                <input
                  autoComplete="new-password"
                  name="password"
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      password: event.target.value
                    }))
                  }
                  placeholder="Use at least 8 characters"
                  required
                />
              </label>

              <label className="registration-field">
                <span>Confirm Password</span>
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  type="password"
                  value={formState.confirmPassword}
                  onChange={(event) => {
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

              {successState ? (
                <div className="registration-message registration-message-success">
                  <strong>{successState.user.full_name}</strong> is registered.
                  Secure session active until{" "}
                  {new Date(successState.expires_at).toLocaleString()}.
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
