import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NX — The System Observes",
  description: "A ritual-based introspection system. It observes. It remembers. It reflects.",
  keywords: ["NX", "introspection", "ritual", "AI", "pattern recognition"],
  openGraph: {
    title: "NX — The System Observes",
    description: "It observes. It remembers. It understands.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
