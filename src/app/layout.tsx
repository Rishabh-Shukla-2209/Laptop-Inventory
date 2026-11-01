import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laptop Inventory Management System",
  description: "Track, manage, and maintain your laptop fleet with ease. Features role-based access, comprehensive history tracking, bulk operations, and real-time dashboard analytics.",
  keywords: ["laptop", "inventory", "management", "tracking", "fleet"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
