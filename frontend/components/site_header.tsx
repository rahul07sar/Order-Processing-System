/**
 * Main navigation.
 */
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

type SiteHeaderProps = {
  isAuthenticated?: boolean;
  isLogoutPending?: boolean;
  onLogout?: (() => void) | null;
  showLoginLink?: boolean;
};

export function SiteHeader({
  isAuthenticated = false,
  isLogoutPending = false,
  onLogout = null,
  showLoginLink = true
}: SiteHeaderProps) {
  const router = useRouter();
  const isLoginPage = router.pathname === "/login";

  return (
    <header className="site-header">
      <Link className="site-logo" href="/home" aria-label="Go to home page">
        <Image src="/logo.png" alt="Order Processing logo" width={164} height={64} priority />
      </Link>

      <nav className="site-header-actions" aria-label="Primary navigation">
        {isAuthenticated && onLogout ? (
          <button
            type="button"
            className="site-nav-button"
            onClick={onLogout}
            disabled={isLogoutPending}
          >
            {isLogoutPending ? "Logging out..." : "Logout"}
          </button>
        ) : showLoginLink ? (
          <Link
            className={`site-nav-link ${isLoginPage ? "site-nav-link-active" : ""}`}
            href="/login"
          >
            Login
          </Link>
        ) : null}

        <button type="button" className="site-cart-button" aria-label="Open cart">
          <Image src="/cart.png" alt="" width={24} height={24} />
        </button>
      </nav>
    </header>
  );
}
