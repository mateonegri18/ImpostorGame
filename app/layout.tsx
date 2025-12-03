import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaProvider } from "@/components/PwaProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Impostor Game",
  description: "Play the popular social deduction game Impostor with your friends online or in person!",
  manifest: "/manifest.webmanifest",
  applicationName: "Impostor Game",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Impostor Game",
  },
  themeColor: "#dc2626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
