import type { Metadata } from "next";
import "./globals.css";
import LayoutClient from "./layoutClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export const metadata: Metadata = {
  title: "TaskSphere",
  description: "TaskSphere Task Management System",
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning style={{ colorScheme: 'light' }}>
      <body className="font-sans antialiased">
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
