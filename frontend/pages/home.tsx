/**
 * Home page that now displays the product gallery entry screen.
 */
import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";

import { SiteHeader } from "../components/site_header";

type SessionUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

const PRODUCT_IMAGES = [
  "/Products/product1.jpg",
  "/Products/product2.jpg",
  "/Products/product3.jpg",
  "/Products/product4.jpg",
  "/Products/product5.jpg"
];

const API_BASE_PATH = "/api";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isLogoutPending, setIsLogoutPending] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadCurrentUser() {
      try {
        const response = await fetch(`${API_BASE_PATH}/auth/me`, {
          credentials: "include"
        });

        if (!isActive) {
          return;
        }

        if (!response.ok) {
          setCurrentUser(null);
          return;
        }

        const payload = (await response.json()) as SessionUser;
        if (!isActive) {
          return;
        }

        setCurrentUser(payload);
      } catch {
        if (isActive) {
          setCurrentUser(null);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleLogout() {
    setIsLogoutPending(true);

    try {
      await fetch(`${API_BASE_PATH}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      setCurrentUser(null);
    } finally {
      setIsLogoutPending(false);
    }
  }

  return (
    <>
      <Head>
        <title>Home | Order Processing System</title>
        <meta
          name="description"
          content="Product gallery home for the order processing platform."
        />
      </Head>

      <main className="products-page">
        <SiteHeader
          isAuthenticated={currentUser !== null}
          isLogoutPending={isLogoutPending}
          onLogout={currentUser ? () => void handleLogout() : null}
        />

        <div className="products-title-wrap">
          <h1 className="products-title">Add products to your cart to checkout</h1>
        </div>

        <section className="products-grid" aria-label="Products">
          {PRODUCT_IMAGES.map((productImage, index) => (
            <figure className="products-card" key={productImage}>
              <Image
                className="products-image"
                src={productImage}
                alt={`Product ${index + 1}`}
                width={720}
                height={720}
                priority={index < 2}
              />
            </figure>
          ))}
        </section>
      </main>
    </>
  );
}
