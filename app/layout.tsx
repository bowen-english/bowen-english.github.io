import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bowen-english.github.io"),
  title: "English Shadow Coach",
  description: "A private English chat partner with silent language feedback.",
  openGraph: {
    title: "English Shadow Coach",
    description: "Chat naturally. Improve quietly.",
    url: "/",
    siteName: "English Shadow Coach",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "English Shadow Coach — Chat naturally. Improve quietly.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "English Shadow Coach",
    description: "Chat naturally. Improve quietly.",
    images: ["/og.png"],
  },
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
