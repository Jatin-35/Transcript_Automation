import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TranscriptAI — Automated Transcription",
  description: "Batch transcription automation powered by Soniox & Azure OpenAI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: "var(--background)" }}>
        <header style={{
          background: "white",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 24px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
        }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 800, fontSize: 14
            }}>T</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#0f172a" }}>TranscriptAI</span>
          </a>
          <a href="/new" style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white", textDecoration: "none",
            padding: "8px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600
          }}>
            + New Job
          </a>
        </header>
        <main style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
