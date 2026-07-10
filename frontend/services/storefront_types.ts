/**
 * Shared storefront types used by product, cart, and checkout pages.
 */
export type SessionUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type StorefrontProduct = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: string;
  image_url: string;
};

export type StorefrontProductListResponse = {
  items: StorefrontProduct[];
};

export type CartItem = {
  productId: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
};

export type CheckoutResponse = {
  payment_reference: string;
  total_amount: string;
  order: {
    id: string;
    status: string;
    total_amount: string;
  };
};
