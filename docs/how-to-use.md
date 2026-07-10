# How To Use The Application

This guide explains how a customer uses the Order Processing System from account creation through checkout and order management.

## Tools & technologies used
A. Frontend: React (Next) and Plain CSS
B. Backend: Python (Core)
C. Database: PostgreSQL
D. Containerization: Docker

## 1. Open the application

- Start the project services if they are not already running.
- Open the frontend in your browser.
- The main user-facing pages are available through the site header and page buttons.

## 2. Register a new account

- Go to the `Registration` page.
- Enter your full name, email address, password, and confirm password.
- Make sure the password meets the app rules:
  - At least 8 characters long.
  - At least one lowercase letter.
  - At least one uppercase letter.
  - At least one special character.
- Click the registration submit button.
- If registration succeeds, the app logs you out immediately and sends you to the `Login` page with a success message.

## 3. Log in

- Open the `Login` page.
- Enter your registered email and password.
- Click `Login`.
- If login succeeds, the app creates a secure session and redirects you to the next relevant page:
  - Usually `Home`.
  - Or back to `Payment` if you were trying to check out before logging in.

## 4. Browse products

- Go to the `Home` page.
- Review the product cards shown in the product gallery.
- Each card shows the product image, name, description, and price.
- Click the product image to open a larger preview.
- Close the preview by:
  - Clicking the close control.
  - Clicking outside the preview.
  - Pressing `Escape`.

## 5. Add products to the cart

- On the `Home` page, click `Add to bag` for any product you want.
- After clicking, the button briefly changes to `Added`.
- The cart icon in the header shows how many items are currently in the cart.

## 6. Review the cart

- Click the cart icon in the header to open the `Cart` page.
- On the cart page you can:
  - Review all selected items.
  - Increase quantity with `+`.
  - Decrease quantity with `-`.
  - Remove a product completely with `Remove`.
- The cart page also shows the current subtotal.
- Use `Continue shopping` or `Close bag` to return to the product page.

## 7. Move to checkout

- From the cart page, click the main checkout button.
- If you are not logged in:
  - The app stores your checkout redirect.
  - It sends you to the `Login` page.
  - After login, it returns you to `Payment`.
- If you are already logged in:
  - The app takes you directly to the `Payment` page.

## 8. Complete payment

- On the `Payment` page, review the items and total amount.
- The current app only accepts debit-card-style payment entry for these supported card types:
  - VISA
  - American Express
  - Mastercard
- You can use the built-in test option:
  - Click `Use test VISA Card` to autofill the dummy test card.
- Or manually enter payment details:
  - Cardholder name
  - Card type
  - Card number
  - Expiry date
  - CVV
- The payment form validates:
  - Card type matches the number entered.
  - Card number length is valid for the selected card.
  - Expiry date is in the future.
  - CVV length is correct.
- Click the payment/checkout action to place the order.
- If checkout succeeds:
  - The cart is cleared.
  - A success message is shown.
  - The new order number is displayed.

## 9. View your orders

- Open `Your Orders` from the site header after logging in.
- The orders page shows:
  - Order number
  - Placed date and time
  - Current status
  - Total
  - Item count
  - Available actions

## 10. Search, filter, and sort orders

- Use the search bar to search by:
  - Customer-facing order number
  - Full internal order ID
- Use the status dropdown to filter orders by status.
- Click table headers to sort orders by:
  - Order number
  - Placed time
  - Status
  - Total amount

## 11. View order details

- Click `View` beside an order to open the detail panel.
- The detail panel shows:
  - Order number
  - Full order ID
  - Placed time
  - Last status update time
  - Total amount
  - Notes
  - Item breakdown
- Close the detail panel by:
  - Clicking the `X` button.
  - Clicking `View` again on the same order row.

## 12. Understand automatic order status changes

- New orders begin as `PENDING`.
- The app automatically advances statuses over time in this sequence:
  - `PENDING`
  - `PROCESSING`
  - `SHIPPED`
  - `DELIVERED`
- The timed transition is based on the order lifecycle logic in the app, with each step advancing after roughly five minutes.
- The orders page refreshes automatically, so status updates should appear without needing a full browser reload.

## 13. Cancel an order

- A `Cancel` button is shown in the orders table.
- You can only cancel an order while it is still `PENDING`.
- If the order is already:
  - `PROCESSING`
  - `SHIPPED`
  - `DELIVERED`
  - `RETURNED`
  - `CANCELLED`
  the cancel button is no longer available for real use.
- If cancellation succeeds, the order status changes to `CANCELLED`.

## 14. Return an order

- A `Return` button appears only for orders that are already `DELIVERED`.
- Click `Return` to mark the order as returned.
- If the return succeeds, the order status changes to `RETURNED`.
- Returned orders remain visible in the orders dashboard and can still be searched, filtered, and viewed.

## 15. Log out

- Use the `Logout` button in the header when you want to end your session.
- After logout:
  - Your secure session ends.
  - Protected pages such as `Your Orders` will require login again.
- Your cart behavior depends on browser-side cart state, but authenticated order actions require an active session.

## 16. Helpful usage notes

- Registration and login are rate-limited for protection.
- Sessions are handled with a secure HttpOnly cookie rather than browser token storage.
- If something fails during registration, login, payment, cancellation, or return, the page shows an error message describing the issue when available.
- If the app says login is required, sign in first and then continue the flow from where you left off.

## 17. Not part of this lifecycle

- Order placement for anonymous users, since either email or phone must be verified (either through otp or similar) to place an order. Placing an order for unverified user might be risky (business constraint) for the platform.
- Return flow is only UI and changes the status, not an actual return.
- Products kept in ~/public/products/, for prod CDN must be used or similar.
