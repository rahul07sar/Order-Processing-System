/**
 * Payment page with client-side card validation before checkout.
 */
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { SiteHeader } from "../components/site_header";
import { fetchCurrentUser } from "../services/auth_service";
import { clearCart, getCartItems, getCartSubtotal } from "../services/cart_service";
import { setCheckoutRedirect, submitCheckout } from "../services/checkout_service";
import { formatCustomerOrderNumber } from "../services/order_service";
import { CartItem, CheckoutResponse, SessionUser } from "../services/storefront_types";

type SupportedCardType = "VISA" | "AMERICAN_EXPRESS" | "MASTERCARD";

type PaymentFormState = {
  cardholderName: string;
  cardType: SupportedCardType;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
};

type PaymentFieldErrors = Partial<Record<keyof PaymentFormState, string>>;

const INITIAL_PAYMENT_FORM: PaymentFormState = {
  cardholderName: "",
  cardType: "VISA",
  cardNumber: "",
  expiryDate: "",
  cvv: ""
};

const DUMMY_VISA_CARD: PaymentFormState = {
  cardholderName: "OPS Test Customer",
  cardType: "VISA",
  cardNumber: "4111 1111 1111 1111",
  expiryDate: "12/30",
  cvv: "123"
};

function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 19);
}

function formatCardNumber(value: string): string {
  const digits = normalizeCardNumber(value);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiryDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isMastercardRange(value: number): boolean {
  return (value >= 51 && value <= 55) || (value >= 2221 && value <= 2720);
}

function detectCardType(cardNumber: string): SupportedCardType | null {
  const digits = normalizeCardNumber(cardNumber);
  if (!digits) {
    return null;
  }

  if (digits.startsWith("4")) {
    return "VISA";
  }

  if (digits.startsWith("34") || digits.startsWith("37")) {
    return "AMERICAN_EXPRESS";
  }

  if (digits.length >= 2 && isMastercardRange(Number(digits.slice(0, 2)))) {
    return "MASTERCARD";
  }

  if (digits.length >= 4 && isMastercardRange(Number(digits.slice(0, 4)))) {
    return "MASTERCARD";
  }

  return null;
}

function buildExpiryCutoffDate(month: number, year: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function validatePaymentForm(formState: PaymentFormState): PaymentFieldErrors {
  const errors: PaymentFieldErrors = {};
  const normalizedName = formState.cardholderName.trim();
  const cardDigits = normalizeCardNumber(formState.cardNumber);
  const detectedCardType = detectCardType(cardDigits);
  const expiryDigits = formState.expiryDate.replace(/\D/g, "");
  const cvvDigits = formState.cvv.replace(/\D/g, "");

  if (normalizedName.length < 2) {
    errors.cardholderName = "Enter the cardholder name.";
  }

  if (!cardDigits) {
    errors.cardNumber = "Enter the card number.";
  } else if (!detectedCardType) {
    errors.cardNumber = "Only VISA, American Express, and Mastercard are supported.";
  } else if (detectedCardType !== formState.cardType) {
    errors.cardType = "Selected card type must match the entered card number.";
  } else if (
    (detectedCardType === "VISA" && ![13, 16, 19].includes(cardDigits.length)) ||
    (detectedCardType === "MASTERCARD" && cardDigits.length !== 16) ||
    (detectedCardType === "AMERICAN_EXPRESS" && cardDigits.length !== 15)
  ) {
    errors.cardNumber = "Card number length does not match the selected card type.";
  }

  if (expiryDigits.length !== 4) {
    errors.expiryDate = "Enter expiry as MM/YY.";
  } else {
    const month = Number(expiryDigits.slice(0, 2));
    const year = Number(`20${expiryDigits.slice(2)}`);
    const now = new Date();
    const currentYear = now.getFullYear();
    const maxAcceptedYear = currentYear + 20;

    if (month < 1 || month > 12) {
      errors.expiryDate = "Expiry month must be between 01 and 12.";
    } else if (year < currentYear || year > maxAcceptedYear) {
      errors.expiryDate = `Expiry year must stay between ${String(currentYear).slice(2)} and ${String(maxAcceptedYear).slice(2)}.`;
    } else {
      const expiryCutoffDate = buildExpiryCutoffDate(month, year);

      if (Number.isNaN(expiryCutoffDate.getTime())) {
        errors.expiryDate = "Enter a valid expiry date.";
      } else if (expiryCutoffDate.getTime() <= now.getTime()) {
        errors.expiryDate = "Card expiry date must be later than today.";
      }
    }
  }

  if (!cvvDigits) {
    errors.cvv = "Enter the security code.";
  } else if (formState.cardType === "AMERICAN_EXPRESS" && cvvDigits.length !== 4) {
    errors.cvv = "American Express uses a 4-digit security code.";
  } else if (formState.cardType !== "AMERICAN_EXPRESS" && cvvDigits.length !== 3) {
    errors.cvv = "VISA and Mastercard use a 3-digit security code.";
  }

  return errors;
}

export default function PaymentPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successState, setSuccessState] = useState<CheckoutResponse | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(INITIAL_PAYMENT_FORM);
  const [fieldErrors, setFieldErrors] = useState<PaymentFieldErrors>({});

  useEffect(() => {
    let isActive = true;

    async function loadState() {
      try {
        const [user] = await Promise.all([fetchCurrentUser()]);
        if (!isActive) {
          return;
        }

        setCurrentUser(user);
        setCartItems(getCartItems());
      } catch {
        if (isActive) {
          setCurrentUser(null);
          setCartItems(getCartItems());
        }
      }
    }

    void loadState();

    function syncCartState() {
      setCartItems(getCartItems());
    }

    if (typeof window !== "undefined") {
      window.addEventListener("ops-cart-changed", syncCartState);
      window.addEventListener("storage", syncCartState);
    }

    return () => {
      isActive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("ops-cart-changed", syncCartState);
        window.removeEventListener("storage", syncCartState);
      }
    };
  }, []);

  async function handleLoginRedirect() {
    setCheckoutRedirect("/payment");
    await router.push("/login?redirectTo=/payment");
  }

  function applyDummyVisaCard() {
    setPaymentForm(DUMMY_VISA_CARD);
    setFieldErrors({});
    setErrorMessage("");
  }

  async function handlePayment() {
    const nextErrors = validatePaymentForm(paymentForm);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setErrorMessage("Please fix the payment details before placing the order.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const checkout = await submitCheckout();
      clearCart();
      setCartItems([]);
      setSuccessState(checkout);
      setPaymentForm(INITIAL_PAYMENT_FORM);
      setFieldErrors({});
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Checkout could not be completed right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Payment | Order Processing System</title>
        <meta name="description" content="Add payment details and complete checkout." />
      </Head>

      <main className="storefront-page">
        <SiteHeader />

        <section className="storefront-shell">
          <div className="storefront-panel">
            <div className="storefront-section-header">
              <h1>Payment</h1>
              <p>Review your order and complete the checkout flow.</p>
            </div>

            {errorMessage ? (
              <div className="storefront-message storefront-message-error">{errorMessage}</div>
            ) : null}

            {successState ? (
              <div className="storefront-empty-state storefront-success-state">
                <p>Your order has been placed successfully.</p>
                <p>
                  Order Number:{" "}
                  <strong>{formatCustomerOrderNumber(successState.order.id)}</strong>
                </p>
                <button
                  type="button"
                  className="storefront-primary-button"
                  onClick={() => void router.push("/home")}
                >
                  Continue shopping
                </button>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="storefront-empty-state">
                <p>Your cart is empty. Add products before checkout.</p>
              </div>
            ) : !currentUser ? (
              <div className="storefront-empty-state">
                <p>Login is required before payment, but your cart stays active.</p>
                <button
                  type="button"
                  className="storefront-primary-button"
                  onClick={() => void handleLoginRedirect()}
                >
                  Login to continue
                </button>
              </div>
            ) : (
              <div className="payment-summary">
                {cartItems.map((item) => (
                  <div className="payment-summary-row" key={item.productId}>
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                    <strong>${(item.unitPrice * item.quantity).toFixed(2)}</strong>
                  </div>
                ))}

                <div className="payment-summary-total">
                  <span>Total</span>
                  <strong>${getCartSubtotal().toFixed(2)}</strong>
                </div>

                <div className="payment-form-panel">
                  <div className="payment-form-header">
                    <h2>We only accept debit card payment as of now</h2>
                    <p>Accepted types: VISA, American Express, and Mastercard.</p>
                  </div>

                  <div className="payment-test-card">
                    <div className="payment-test-card-copy">
                      <strong>Dummy VISA test card, please click the button "Use Test VISA" to autofill</strong>
                      <span>Use this for local checkout testing only.</span>
                    </div>
                    <button
                      type="button"
                      className="storefront-secondary-button"
                      onClick={applyDummyVisaCard}
                    >
                      Use test VISA Card
                    </button>
                  </div>

                  <div className="payment-card-types" aria-label="Accepted card types">
                    <span className={paymentForm.cardType === "VISA" ? "payment-card-chip payment-card-chip-active" : "payment-card-chip"}>
                      VISA
                    </span>
                    <span
                      className={
                        paymentForm.cardType === "AMERICAN_EXPRESS"
                          ? "payment-card-chip payment-card-chip-active"
                          : "payment-card-chip"
                      }
                    >
                      AMEX
                    </span>
                    <span
                      className={
                        paymentForm.cardType === "MASTERCARD"
                          ? "payment-card-chip payment-card-chip-active"
                          : "payment-card-chip"
                      }
                    >
                      Mastercard
                    </span>
                  </div>

                  <div className="payment-form-grid">
                    <label className="payment-field">
                      <span>Cardholder Name</span>
                      <input
                        type="text"
                        autoComplete="cc-name"
                        value={paymentForm.cardholderName}
                        onChange={(event) => {
                          setPaymentForm((current) => ({
                            ...current,
                            cardholderName: event.target.value
                          }));
                          setFieldErrors((current) => ({ ...current, cardholderName: undefined }));
                        }}
                        placeholder="Cardholder Name"
                      />
                      {fieldErrors.cardholderName ? (
                        <small className="payment-field-error">{fieldErrors.cardholderName}</small>
                      ) : null}
                    </label>

                    <label className="payment-field">
                      <span>Card Type</span>
                      <select
                        value={paymentForm.cardType}
                        onChange={(event) => {
                          setPaymentForm((current) => ({
                            ...current,
                            cardType: event.target.value as SupportedCardType
                          }));
                          setFieldErrors((current) => ({ ...current, cardType: undefined }));
                        }}
                      >
                        <option value="VISA">VISA</option>
                        <option value="AMERICAN_EXPRESS">AMERICAN EXPRESS</option>
                        <option value="MASTERCARD">MASTERCARD</option>
                      </select>
                      {fieldErrors.cardType ? (
                        <small className="payment-field-error">{fieldErrors.cardType}</small>
                      ) : null}
                    </label>

                    <label className="payment-field payment-field-wide">
                      <span>Card Number</span>
                      <input
                        type="text"
                        autoComplete="cc-number"
                        inputMode="numeric"
                        value={paymentForm.cardNumber}
                        onChange={(event) => {
                          const formattedValue = formatCardNumber(event.target.value);
                          setPaymentForm((current) => ({
                            ...current,
                            cardNumber: formattedValue
                          }));
                          setFieldErrors((current) => ({
                            ...current,
                            cardNumber: undefined,
                            cardType: undefined
                          }));
                        }}
                        placeholder="4111 1111 1111 1111"
                      />
                      {fieldErrors.cardNumber ? (
                        <small className="payment-field-error">{fieldErrors.cardNumber}</small>
                      ) : null}
                    </label>

                    <label className="payment-field">
                      <span>Expiry</span>
                      <input
                        type="text"
                        autoComplete="cc-exp"
                        inputMode="numeric"
                        value={paymentForm.expiryDate}
                        onChange={(event) => {
                          setPaymentForm((current) => ({
                            ...current,
                            expiryDate: formatExpiryDate(event.target.value)
                          }));
                          setFieldErrors((current) => ({ ...current, expiryDate: undefined }));
                        }}
                        placeholder="MM/YY"
                      />
                      {fieldErrors.expiryDate ? (
                        <small className="payment-field-error">{fieldErrors.expiryDate}</small>
                      ) : null}
                    </label>

                    <label className="payment-field">
                      <span>CVV</span>
                      <input
                        type="password"
                        autoComplete="cc-csc"
                        inputMode="numeric"
                        value={paymentForm.cvv}
                        onChange={(event) => {
                          setPaymentForm((current) => ({
                            ...current,
                            cvv: event.target.value.replace(/\D/g, "").slice(0, 4)
                          }));
                          setFieldErrors((current) => ({ ...current, cvv: undefined }));
                        }}
                        placeholder={paymentForm.cardType === "AMERICAN_EXPRESS" ? "1234" : "123"}
                      />
                      {fieldErrors.cvv ? (
                        <small className="payment-field-error">{fieldErrors.cvv}</small>
                      ) : null}
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  className="storefront-primary-button"
                  onClick={() => void handlePayment()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing payment..." : "Pay and place order"}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
