import type { Metadata } from "next";
import "../index.css";

export const metadata: Metadata = {
  title: "WebCon",
  description: "AI-powered learning platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
