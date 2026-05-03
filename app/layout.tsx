import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Shadow Coach",
  description: "A private English chat partner with silent language feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
