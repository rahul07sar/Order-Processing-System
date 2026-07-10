/**
 * Cart page for reviewing bag contents before checkout.
 */
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { SiteHeader } from "../components/site_header";
import { fetchCurrentUser } from "../services/auth_service";
import {
  getCartItems,
  getCartSubtotal,
  removeCartItem,
  updateCartItemQuantity
} from "../services/cart_service";
import { CartItem } from "../services/storefront_types";

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    function syncCart() {
      setCartItems(getCartItems());
    }

    function handleAuthChanged() {
      void loadAuth();
    }

    syncCart();

    async function loadAuth() {
      try {
        const user = await fetchCurrentUser();
        setIsAuthenticated(user !== null);
      } catch {
        setIsAuthenticated(false);
      }
    }

    void loadAuth();

    if (typeof window !== "undefined") {
      window.addEventListener("ops-cart-changed", syncCart);
      window.addEventListener("ops-auth-changed", handleAuthChanged);
      window.addEventListener("storage", syncCart);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("ops-cart-changed", syncCart);
        window.removeEventListener("ops-auth-changed", handleAuthChanged);
        window.removeEventListener("storage", syncCart);
      }
    };
  }, []);

  async function handleCheckout() {
    if (cartItems.length === 0) {
      return;
    }

    if (isAuthenticated) {
      await router.push("/payment");
      return;
    }

    await router.push("/login?redirectTo=/payment");
  }

  return (
    <>
      <Head>
        <title>Cart | Order Processing System</title>
        <meta name="description" content="Review cart items before checkout." />
      </Head>

      <main className="storefront-page">
        <SiteHeader />

        <section className="storefront-shell">
          <div className="storefront-panel">
            <div className="storefront-section-header storefront-section-header-row">
              <div>
                <h1>Your bag</h1>
                <p>Review products, adjust quantities, and continue to checkout.</p>
              </div>
              <button
                type="button"
                className="storefront-secondary-button"
                onClick={() => void router.push("/home")}
              >
                Close bag
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="storefront-empty-state">
                <p>Your cart is empty right now.</p>
                <button
                  type="button"
                  className="storefront-secondary-button"
                  onClick={() => void router.push("/home")}
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <div className="cart-list">
                {cartItems.map((item) => (
                  <article className="cart-item" key={item.productId}>
                    <Image
                      className="cart-item-image"
                      src={item.imageUrl}
                      alt={item.name}
                      width={120}
                      height={120}
                    />

                    <div className="cart-item-copy">
                      <h2>{item.name}</h2>
                      <p>{item.description}</p>
                      <span className="cart-item-price">${item.unitPrice.toFixed(2)}</span>
                    </div>

                    <div className="cart-item-actions">
                      <div className="cart-quantity-controls">
                        <button
                          type="button"
                          onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-remove-button"
                        onClick={() => removeCartItem(item.productId)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}

                <div className="cart-summary">
                  <span>Subtotal</span>
                  <strong>${getCartSubtotal().toFixed(2)}</strong>
                </div>

                <button type="button" className="storefront-primary-button" onClick={() => void handleCheckout()}>
                  {isAuthenticated ? "Proceed to payment" : "Login to checkout"}
                </button>

                <button
                  type="button"
                  className="storefront-secondary-button"
                  onClick={() => void router.push("/home")}
                >
                  Continue shopping
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
