"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      style={{
        border: "1px solid var(--panel-border)",
        background: "var(--panel)",
        color: "var(--foreground)",
        borderRadius: 999,
        padding: "12px 16px",
        cursor: "pointer",
        boxShadow: "var(--shadow)"
      }}
    >
      {isDark ? "Switch to light" : "Switch to dark"}
    </button>
  );
}
