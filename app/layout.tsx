import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nearhere",
  description: "A quiet companion for the open road — it speaks up when something worth knowing is near.",
};

export const viewport: Viewport = {
  themeColor: "#1b1c18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
