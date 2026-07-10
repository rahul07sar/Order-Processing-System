/**
 * Authenticated user orders page with order-number lookup, order-ID lookup, sorting, and cancellation.
 */
import Head from "next/head";
import { useRouter } from "next/router";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { SiteHeader } from "../components/site_header";
import { fetchCurrentUser } from "../services/auth_service";
import {
  cancelOrder,
  fetchOrderDetails,
  formatCustomerOrderNumber,
  listOrders,
  returnOrder
} from "../services/order_service";
import { OrderResponse, OrderStatus, SessionUser } from "../services/storefront_types";

type SortField = "created_at" | "status" | "total_amount" | "order_number";
type SortDirection = "asc" | "desc";

const STATUS_OPTIONS: Array<OrderStatus | ""> = [
  "",
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "CANCELLED"
];

const ORDER_STATUS_ACTION_MESSAGES: Record<OrderStatus, string> = {
  PENDING: "Cancel this order.",
  PROCESSING: "Order is processing and can no longer be cancelled online.",
  SHIPPED: "Order shipped, cancellation is no longer available.",
  DELIVERED: "Order delivered. You can start a return from here.",
  RETURNED: "Order already returned.",
  CANCELLED: "Order already cancelled."
};

function formatCurrency(amount: string): string {
  return `$${Number(amount).toFixed(2)}`;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

export default function OrdersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingDetailOrderId, setLoadingDetailOrderId] = useState<string | null>(null);
  const [activeCancelOrderId, setActiveCancelOrderId] = useState<string | null>(null);
  const [activeReturnOrderId, setActiveReturnOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    let refreshTimer: number | null = null;

    async function loadOrders(showLoader: boolean) {
      if (showLoader) {
        setIsLoading(true);
      }
      setErrorMessage("");

      try {
        const [user, orderPayload] = await Promise.all([fetchCurrentUser(), listOrders(statusFilter)]);

        if (!isActive) {
          return;
        }

        setCurrentUser(user);
        setOrders(orderPayload.items);
        setSelectedOrder((current) => {
          if (!current) {
            return null;
          }

          const refreshedOrder = orderPayload.items.find((item) => item.id === current.id);
          return refreshedOrder ?? null;
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Orders could not be loaded right now."
        );
      } finally {
        if (isActive && showLoader) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders(true);

    if (typeof window !== "undefined") {
      refreshTimer = window.setInterval(() => {
        void loadOrders(false);
      }, 30000);
    }

    return () => {
      isActive = false;
      if (refreshTimer !== null) {
        window.clearInterval(refreshTimer);
      }
    };
  }, [statusFilter]);

  const visibleOrders = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const searchedOrders = normalizedSearchTerm
      ? orders.filter((order) => {
          const orderNumber = formatCustomerOrderNumber(order.id).toLowerCase();
          const fullOrderId = order.id.toLowerCase();
          return (
            orderNumber.startsWith(normalizedSearchTerm) ||
            fullOrderId.startsWith(normalizedSearchTerm)
          );
        })
      : orders;

    return [...searchedOrders].sort((left, right) => {
      let result = 0;

      if (sortField === "created_at") {
        result = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      } else if (sortField === "status") {
        result = compareText(left.status, right.status);
      } else if (sortField === "total_amount") {
        result = Number(left.total_amount) - Number(right.total_amount);
      } else {
        result = compareText(
          formatCustomerOrderNumber(left.id),
          formatCustomerOrderNumber(right.id)
        );
      }

      return sortDirection === "asc" ? result : result * -1;
    });
  }, [orders, searchTerm, sortField, sortDirection]);

  function toggleSort(nextField: SortField) {
    if (sortField === nextField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(nextField);
    setSortDirection(nextField === "created_at" ? "desc" : "asc");
  }

  async function handleSelectOrder(orderId: string) {
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(null);
      return;
    }

    setLoadingDetailOrderId(orderId);
    setErrorMessage("");

    try {
      const order = await fetchOrderDetails(orderId);
      setSelectedOrder(order);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Order details could not be loaded."
      );
    } finally {
      setLoadingDetailOrderId(null);
    }
  }

  async function handleCancelOrder(orderId: string) {
    setActiveCancelOrderId(orderId);
    setErrorMessage("");

    try {
      const cancelledOrder = await cancelOrder(orderId);
      setOrders((current) =>
        current.map((order) => (order.id === cancelledOrder.id ? cancelledOrder : order))
      );
      setSelectedOrder((current) =>
        current?.id === cancelledOrder.id ? cancelledOrder : current
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The order could not be cancelled."
      );
    } finally {
      setActiveCancelOrderId(null);
    }
  }

  async function handleReturnOrder(orderId: string) {
    setActiveReturnOrderId(orderId);
    setErrorMessage("");

    try {
      const returnedOrder = await returnOrder(orderId);
      setOrders((current) =>
        current.map((order) => (order.id === returnedOrder.id ? returnedOrder : order))
      );
      setSelectedOrder((current) => (current?.id === returnedOrder.id ? returnedOrder : current));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The order could not be returned."
      );
    } finally {
      setActiveReturnOrderId(null);
    }
  }

  function renderSortLabel(field: SortField, label: string): string {
    if (sortField !== field) {
      return label;
    }

    return `${label} ${sortDirection === "asc" ? "↑" : "↓"}`;
  }

  function handleStatusFilterChange(event: ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(event.target.value as OrderStatus | "");
  }

  return (
    <>
      <Head>
        <title>My Orders | Order Processing System</title>
        <meta
          name="description"
          content="User orders page with order ID lookup, filtering, sorting, detail lookup, and cancellation."
        />
      </Head>

      <main className="storefront-page">
        <SiteHeader showLoginLink={false} />

        <section className="storefront-shell">
          <div className="storefront-panel">
            <div className="storefront-section-header">
              <h1>{currentUser ? `Welcome! ${currentUser.full_name}` : "Your Orders"}</h1>
            </div>

            {!currentUser && !isLoading ? (
              <div className="storefront-empty-state">
                <p>Login is required to view your orders.</p>
                <button
                  type="button"
                  className="storefront-primary-button"
                  onClick={() => void router.push("/login?redirectTo=/orders")}
                >
                  Login to continue
                </button>
              </div>
            ) : (
              <>
                <div className="orders-toolbar">
                  <label className="orders-filter-field">
                    <span>Search</span>
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by order number or full order ID"
                    />
                  </label>

                  <label className="orders-filter-field">
                    <span>Status</span>
                    <select value={statusFilter} onChange={handleStatusFilterChange}>
                      <option value="">All statuses</option>
                      {STATUS_OPTIONS.filter((status) => status !== "").map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {errorMessage ? (
                  <div className="storefront-message storefront-message-error">{errorMessage}</div>
                ) : null}

                {isLoading ? (
                  <div className="storefront-empty-state">
                    <p>Loading your orders...</p>
                  </div>
                ) : visibleOrders.length === 0 ? (
                  <div className="storefront-empty-state">
                    <p>No orders matched the current filters.</p>
                  </div>
                ) : (
                  <div className="orders-table-wrap">
                    <table className="orders-table">
                      <thead>
                        <tr>
                          <th>
                            <button type="button" onClick={() => toggleSort("order_number")}>
                              {renderSortLabel("order_number", "Order Number")}
                            </button>
                          </th>
                          <th>
                            <button type="button" onClick={() => toggleSort("created_at")}>
                              {renderSortLabel("created_at", "Placed At")}
                            </button>
                          </th>
                          <th>
                            <button type="button" onClick={() => toggleSort("status")}>
                              {renderSortLabel("status", "Status")}
                            </button>
                          </th>
                          <th>
                            <button type="button" onClick={() => toggleSort("total_amount")}>
                              {renderSortLabel("total_amount", "Total")}
                            </button>
                          </th>
                          <th>Items</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleOrders.map((order) => {
                          const isPending = order.status === "PENDING";
                          const isDelivered = order.status === "DELIVERED";
                          const isCancelling = activeCancelOrderId === order.id;
                          const isReturning = activeReturnOrderId === order.id;
                          const cancelActionMessage = ORDER_STATUS_ACTION_MESSAGES[order.status];

                          return (
                            <tr
                              key={order.id}
                              className={
                                selectedOrder?.id === order.id ? "orders-table-row-active" : ""
                              }
                            >
                              <td>{formatCustomerOrderNumber(order.id)}</td>
                              <td>{new Date(order.created_at).toLocaleString()}</td>
                              <td>
                                <span
                                  className={`orders-status-pill orders-status-${order.status.toLowerCase()}`}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td>{formatCurrency(order.total_amount)}</td>
                              <td>{order.items.length}</td>
                              <td>
                                <div className="orders-row-actions">
                                  <button
                                    type="button"
                                    className="orders-table-action"
                                    onClick={() => void handleSelectOrder(order.id)}
                                  >
                                    {loadingDetailOrderId === order.id ? "Loading..." : "View"}
                                  </button>

                                  <span className="orders-action-tooltip">
                                    <button
                                      type="button"
                                      className="orders-table-action orders-table-action-cancel"
                                      disabled={!isPending || isCancelling}
                                      onClick={() => void handleCancelOrder(order.id)}
                                    >
                                      {isCancelling ? "Cancelling..." : "Cancel"}
                                    </button>
                                    <span className="orders-action-tooltip-bubble" role="tooltip">
                                      {cancelActionMessage}
                                    </span>
                                  </span>

                                  {isDelivered ? (
                                    <span className="orders-action-tooltip">
                                      <button
                                        type="button"
                                        className="orders-table-action orders-table-action-return"
                                        disabled={isReturning}
                                        onClick={() => void handleReturnOrder(order.id)}
                                      >
                                        {isReturning ? "Returning..." : "Return"}
                                      </button>
                                      <span
                                        className="orders-action-tooltip-bubble"
                                        role="tooltip"
                                      >
                                        Return this delivered order.
                                      </span>
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedOrder ? (
                  <div className="orders-detail-panel">
                    <div className="orders-detail-header">
                      <div className="orders-detail-header-content">
                        <div>
                          <h2>Order Details</h2>
                          <p>
                            Order Number {formatCustomerOrderNumber(selectedOrder.id)} linked to
                            order ID {selectedOrder.id}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="orders-detail-close-button"
                          onClick={() => setSelectedOrder(null)}
                          aria-label="Close order details"
                        >
                          ×
                        </button>
                      </div>
                      <span
                        className={`orders-status-pill orders-status-${selectedOrder.status.toLowerCase()}`}
                      >
                        {selectedOrder.status}
                      </span>
                    </div>

                    <div className="orders-detail-grid">
                      <div className="orders-detail-card">
                        <strong>Placed At</strong>
                        <span>{new Date(selectedOrder.created_at).toLocaleString()}</span>
                      </div>
                      <div className="orders-detail-card">
                        <strong>Status Updated</strong>
                        <span>{new Date(selectedOrder.status_updated_at).toLocaleString()}</span>
                      </div>
                      <div className="orders-detail-card">
                        <strong>Total Amount</strong>
                        <span>{formatCurrency(selectedOrder.total_amount)}</span>
                      </div>
                      <div className="orders-detail-card">
                        <strong>Notes</strong>
                        <span>{selectedOrder.notes || "No notes were added for this order."}</span>
                      </div>
                    </div>

                    <div className="orders-detail-items">
                      <h3>Items</h3>
                      <table className="orders-items-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item) => (
                            <tr key={item.id}>
                              <td>{item.product_name}</td>
                              <td>{item.sku}</td>
                              <td>{item.quantity}</td>
                              <td>{formatCurrency(item.unit_price)}</td>
                              <td>{formatCurrency(item.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
