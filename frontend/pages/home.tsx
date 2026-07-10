/**
 * Home page that displays the storefront product gallery.
 */
import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";

import { SiteHeader } from "../components/site_header";
import { addProductToCart } from "../services/cart_service";
import { fetchProductCatalog } from "../services/product_catalog_service";
import { StorefrontProduct } from "../services/storefront_types";

export default function HomePage() {
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const [feedbackProductId, setFeedbackProductId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadProducts() {
      try {
        const payload = await fetchProductCatalog();
        if (isActive) {
          setProducts(payload.items);
          setErrorMessage("");
        }
      } catch {
        if (isActive) {
          setErrorMessage("We could not load products right now. Please refresh and try again.");
        }
      }
    }

    void loadProducts();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProduct || typeof window === "undefined") {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedProduct(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedProduct]);

  function handleAddToBag(product: StorefrontProduct) {
    addProductToCart(product);
    setFeedbackProductId(product.id);

    window.setTimeout(() => {
      setFeedbackProductId((current) => (current === product.id ? null : current));
    }, 1400);
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
        <SiteHeader />

        <div className="products-title-wrap">
          <h1 className="products-title">Add products to your cart to checkout</h1>
        </div>

        {errorMessage ? <div className="storefront-message storefront-message-error">{errorMessage}</div> : null}

        <section className="products-grid" aria-label="Products">
          {products.map((product, index) => (
            <article className="products-card" key={product.id}>
              <button
                type="button"
                className="products-image-button"
                onClick={() => setSelectedProduct(product)}
                aria-label={`View larger image for ${product.name}`}
              >
                <Image
                  className="products-image"
                  src={product.image_url}
                  alt={product.name}
                  width={720}
                  height={720}
                  priority={index < 2}
                />
              </button>

              <div className="products-card-body">
                <div className="products-card-copy">
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                </div>

                <div className="products-card-footer">
                  <span className="products-price">${Number(product.price).toFixed(2)}</span>
                  <button
                    type="button"
                    className="products-bag-button"
                    onClick={() => handleAddToBag(product)}
                  >
                    {feedbackProductId === product.id ? "Added" : "Add to bag"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        {selectedProduct ? (
          <div
            className="products-modal-backdrop"
            role="presentation"
            onClick={() => setSelectedProduct(null)}
          >
            <div
              className="products-modal"
              role="dialog"
              aria-modal="true"
              aria-label={selectedProduct.name}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="products-modal-close"
                onClick={() => setSelectedProduct(null)}
                aria-label="Close product preview"
              >
                Close preview
              </button>
              <Image
                className="products-modal-image"
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                width={1200}
                height={1200}
              />
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
