import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QuickNav from "@/components/QuickNav";
import FloatingChat from "@/components/FloatingChat";
import PresenceIndicator from "@/components/PresenceIndicator";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "甜蜜小屋 💕",
  description: "情侣专属小天地 - 记录你们的甜蜜时光",
  keywords: ["情侣", "纪念日", "日记", "相册", "甜蜜"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} font-sans antialiased bg-gradient-to-br from-pink-50 via-rose-50 to-sky-50 min-h-screen`}>
        <QuickNav />
        {/* 在线状态指示器 */}
        <div className="fixed top-4 right-4 z-40 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-pink-100">
          <PresenceIndicator />
        </div>
        <main className="animate-fadeIn">
          {children}
        </main>
        <FloatingChat />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
