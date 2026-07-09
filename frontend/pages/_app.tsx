/**
 * Shared Pages Router entrypoint that wires global styling and theming.
 */
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";

import "../css/globals.css";
import "../css/registration.css";

export default function OrderProcessingApp({ Component, pageProps }: AppProps) {
  return (
    // Theme state is shared here so every page follows the same light/dark behavior.
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
