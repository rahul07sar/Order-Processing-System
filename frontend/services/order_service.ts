/**
 * Order API helpers for the authenticated customer experience.
 */
import { OrderListResponse, OrderResponse, OrderStatus } from "./storefront_types";

const API_BASE_PATH = "/api";

export async function listOrders(status?: OrderStatus | ""): Promise<OrderListResponse> {
  const searchParams = new URLSearchParams();
  if (status) {
    searchParams.set("status", status);
  }

  const response = await fetch(
    `${API_BASE_PATH}/orders${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    {
      credentials: "include"
    }
  );

  if (!response.ok) {
    throw new Error("Orders could not be loaded right now.");
  }

  return (await response.json()) as OrderListResponse;
}

export async function fetchOrderDetails(orderId: string): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_PATH}/orders/${orderId}`, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Order details could not be loaded.");
  }

  return (await response.json()) as OrderResponse;
}

export async function cancelOrder(orderId: string): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_PATH}/orders/${orderId}/cancel`, {
    method: "POST",
    credentials: "include"
  });

  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.detail || "The order could not be cancelled.");
  }

  return payload as OrderResponse;
}

export async function returnOrder(orderId: string): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_PATH}/orders/${orderId}/return`, {
    method: "POST",
    credentials: "include"
  });

  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.detail || "The order could not be returned.");
  }

  return payload as OrderResponse;
}

export function formatCustomerOrderNumber(orderId: string): string {
  let hash = 0;

  for (const character of orderId) {
    hash = (hash * 31 + character.charCodeAt(0)) % 900000;
  }

  return String(hash + 100000);
}
