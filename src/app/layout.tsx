import { ClerkProvider } from "@clerk/nextjs";
import "~/styles/globals.css";
import { Providers } from "./providers";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Airtable Clone",
  description: "A modern Airtable clone built with Next.js",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <ClerkProvider>
        <Providers>
          <body>{children}</body>
        </Providers>
      </ClerkProvider>
    </html>
  );
}
