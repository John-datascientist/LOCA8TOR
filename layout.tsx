import type { Metadata } from "next";
import { Geist, Geist_Mono, Baloo_2 } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { getSelectedCountry } from "@/lib/location-server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baloo2 = Baloo_2({
  variable: "--font-baloo-two",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "WeGive: Give What You Can. Get What You Need.",
    template: "%s · WeGive",
  },
  description:
    "WeGive connects people and businesses giving away useful items with people who need them, and makes it easier to get those items delivered.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const country = await getSelectedCountry();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${baloo2.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader user={user} country={country} />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
