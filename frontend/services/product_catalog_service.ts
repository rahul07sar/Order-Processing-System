/**
 * Frontend helpers for loading the product catalog service.
 */
import { StorefrontProductListResponse } from "./storefront_types";

const API_BASE_PATH = "/api";

export async function fetchProductCatalog(): Promise<StorefrontProductListResponse> {
  const response = await fetch(`${API_BASE_PATH}/products`);
  if (!response.ok) {
    throw new Error("Unable to load products.");
  }

  return (await response.json()) as StorefrontProductListResponse;
}
