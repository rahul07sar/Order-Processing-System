/**
 * Main navigation.
 */
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { fetchCurrentUser, logoutCurrentUser } from "../services/auth_service";
import { getCartQuantity } from "../services/cart_service";
import { SessionUser } from "../services/storefront_types";

type SiteHeaderProps = {
  onLogout?: (() => void) | null;
  showLoginLink?: boolean;
};

export function SiteHeader({ onLogout = null, showLoginLink = true }: SiteHeaderProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isLoginPage = router.pathname === "/login";
  const isOrdersPage = router.pathname === "/orders";
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isLogoutPending, setIsLogoutPending] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [isThemeMounted, setIsThemeMounted] = useState(false);

  useEffect(() => {
    setIsThemeMounted(true);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadCurrentUser() {
      try {
        const user = await fetchCurrentUser();
        if (isActive) {
          setCurrentUser(user);
        }
      } catch {
        if (isActive) {
          setCurrentUser(null);
        }
      }
    }

    void loadCurrentUser();

    function handleAuthChanged() {
      void loadCurrentUser();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("ops-auth-changed", handleAuthChanged);
    }

    return () => {
      isActive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("ops-auth-changed", handleAuthChanged);
      }
    };
  }, []);

  useEffect(() => {
    function syncCartQuantity() {
      setCartQuantity(getCartQuantity());
    }

    syncCartQuantity();

    if (typeof window !== "undefined") {
      window.addEventListener("ops-cart-changed", syncCartQuantity);
      window.addEventListener("storage", syncCartQuantity);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("ops-cart-changed", syncCartQuantity);
        window.removeEventListener("storage", syncCartQuantity);
      }
    };
  }, []);

  async function handleLogout() {
    setIsLogoutPending(true);

    try {
      await logoutCurrentUser();
      setCurrentUser(null);
      onLogout?.();
      await router.replace("/home");
    } finally {
      setIsLogoutPending(false);
    }
  }

  const isDarkMode = isThemeMounted ? resolvedTheme === "dark" : false;

  return (
    <header className="site-header">
      <Link className="site-logo" href="/home" aria-label="Go to home page">
        <Image src="/logo.png" alt="Order Processing logo" width={164} height={64} priority />
      </Link>

      <nav className="site-header-actions" aria-label="Primary navigation">
        <button
          type="button"
          className="site-nav-button site-theme-toggle"
          onClick={() => setTheme(isDarkMode ? "light" : "dark")}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Image
            src={isDarkMode ? "/toggle/lightmode.png" : "/toggle/darkmode.png"}
            alt=""
            width={22}
            height={22}
          />
        </button>

        {currentUser ? (
          <>
            <Link
              className={`site-nav-link ${isOrdersPage ? "site-nav-link-active" : ""}`}
              href="/orders"
            >
              Your Orders
            </Link>
            <button
              type="button"
              className="site-nav-button"
              onClick={() => void handleLogout()}
              disabled={isLogoutPending}
            >
              {isLogoutPending ? "Logging out..." : "Logout"}
            </button>
          </>
        ) : showLoginLink ? (
          <Link
            className={`site-nav-link ${isLoginPage ? "site-nav-link-active" : ""}`}
            href="/login"
          >
            Login
          </Link>
        ) : null}

        <button
          type="button"
          className="site-cart-button"
          aria-label="Open cart"
          onClick={() => void router.push("/cart")}
        >
          <Image src="/cart.png" alt="" width={24} height={24} />
          {cartQuantity > 0 ? <span className="site-cart-count">{cartQuantity}</span> : null}
        </button>
      </nav>
    </header>
  );
}
