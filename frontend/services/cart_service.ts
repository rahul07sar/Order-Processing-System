/**
 * Session-persistent cart helpers backed by browser localStorage.
 */
import { CartItem, StorefrontProduct } from "./storefront_types";

const CART_STORAGE_KEY = "ops-cart-items";

function emitCartChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("ops-cart-changed"));
}

function writeCartItems(items: CartItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  emitCartChanged();
}

export function getCartItems(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    return JSON.parse(rawValue) as CartItem[];
  } catch {
    return [];
  }
}

export function getCartQuantity(): number {
  return getCartItems().reduce((total, item) => total + item.quantity, 0);
}

export function getCartSubtotal(): number {
  return getCartItems().reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

export function addProductToCart(product: StorefrontProduct): void {
  const currentItems = getCartItems();
  const unitPrice = Number(product.price);
  const matchingItem = currentItems.find((item) => item.productId === product.id);

  if (matchingItem) {
    writeCartItems(
      currentItems.map((item) =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
    return;
  }

  writeCartItems([
    ...currentItems,
    {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      imageUrl: product.image_url,
      unitPrice,
      quantity: 1
    }
  ]);
}

export function updateCartItemQuantity(productId: string, nextQuantity: number): void {
  if (nextQuantity <= 0) {
    removeCartItem(productId);
    return;
  }

  writeCartItems(
    getCartItems().map((item) =>
      item.productId === productId ? { ...item, quantity: nextQuantity } : item
    )
  );
}

export function removeCartItem(productId: string): void {
  writeCartItems(getCartItems().filter((item) => item.productId !== productId));
}

export function clearCart(): void {
  writeCartItems([]);
}
