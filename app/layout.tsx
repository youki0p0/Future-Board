import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Future Board by Project MAKINA",
  description: "仕込め。踏め。笑え。— みんなで未来のマスを仕込んで、みんなで踏みに行くパーティすごろく。",
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="font-mono antialiased">{children}</body>
    </html>
  );
}
