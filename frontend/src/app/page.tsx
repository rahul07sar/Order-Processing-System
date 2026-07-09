/**
 * Lightweight landing dashboard for the original App Router shell.
 */
import { ThemeToggle } from "@/components/theme-toggle";

const statusCards = [
  {
    label: "PENDING",
    detail: "New customer orders waiting to be picked up by the processor."
  },
  {
    label: "PROCESSING",
    detail: "Orders actively validated, packed, or moved by the scheduler."
  },
  {
    label: "SHIPPED",
    detail: "Orders that left the warehouse and are en route to customers."
  },
  {
    label: "DELIVERED",
    detail: "Orders successfully completed and ready for reporting."
  }
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 20px 48px"
      }}
    >
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "grid",
          gap: 24
        }}
        >
          {/* Header section */}
          <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap"
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px",
                letterSpacing: "0.2em",
                fontSize: 12,
                color: "var(--muted)"
              }}
            >
              E-COMMERCE OPS
            </p>
            <h1 style={{ margin: 0, fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
              Order Processing System
            </h1>
          </div>
          <ThemeToggle />
          </div>

          {/* Status overview cards */}
          <div
          style={{
            padding: 28,
            borderRadius: 28,
            background: "var(--panel)",
            border: "1px solid var(--panel-border)",
            boxShadow: "var(--shadow)",
            backdropFilter: "blur(18px)"
          }}
        >
          <p
            style={{
              margin: "0 0 14px",
              maxWidth: 680,
              color: "var(--muted)",
              lineHeight: 1.65
            }}
          >
            We&apos;ve laid the first foundation for the assignment: a Next.js
            frontend shell, a FastAPI backend entrypoint, Dockerized services,
            and the theme system the UI will keep using as we add real order
            workflows.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16
            }}
          >
            {statusCards.map((card) => (
              <article
                key={card.label}
                style={{
                  borderRadius: 22,
                  padding: 18,
                  border: "1px solid var(--panel-border)",
                  background: "rgba(255,255,255,0.04)"
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    color: "var(--accent)",
                    fontSize: 13,
                    letterSpacing: "0.16em"
                  }}
                >
                  {card.label}
                </p>
                <p style={{ margin: 0, lineHeight: 1.55 }}>{card.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
