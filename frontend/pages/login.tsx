/**
 * Dedicated login route for returning customers.
 */
import Head from "next/head";

import { AuthSessionShell } from "../components/auth-session-shell";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Login | Order Processing System</title>
        <meta
          name="description"
          content="Login page for customer order access in the order processing platform."
        />
      </Head>

      <AuthSessionShell mode="login" />
    </>
  );
}
