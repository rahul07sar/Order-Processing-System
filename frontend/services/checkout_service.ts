/**
 * Frontend helpers for checkout redirection and payment submission.
 */
import { CheckoutResponse } from "./storefront_types";
import { getCartItems } from "./cart_service";

const API_BASE_PATH = "/api";
const CHECKOUT_REDIRECT_KEY = "ops-checkout-redirect";

export function setCheckoutRedirect(pathname: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(CHECKOUT_REDIRECT_KEY, pathname);
}

export function consumeCheckoutRedirect(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const redirectPath = window.sessionStorage.getItem(CHECKOUT_REDIRECT_KEY);
  if (!redirectPath) {
    return null;
  }

  window.sessionStorage.removeItem(CHECKOUT_REDIRECT_KEY);
  return redirectPath;
}

export async function submitCheckout(): Promise<CheckoutResponse> {
  const response = await fetch(`${API_BASE_PATH}/payments/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      items: getCartItems().map((item) => ({
        product_id: item.productId,
        quantity: item.quantity
      }))
    })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail || "Checkout could not be completed.");
  }

  return (await response.json()) as CheckoutResponse;
}
