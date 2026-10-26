import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rail — Parts register",
  description: "A traceable parts register for rolling stock. Search physical parts, inspect assembly histories, and exchange eligible parts atomically.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;
}
