/**
 * Home page that now acts as the secured customer access entrypoint.
 */
import Head from "next/head";

import { AuthSessionShell } from "../components/auth-session-shell";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Home | Order Processing System</title>
        <meta
          name="description"
          content="Secure login entrypoint for customer order access in the order processing platform."
        />
      </Head>

      <AuthSessionShell mode="home" />
    </>
  );
}
