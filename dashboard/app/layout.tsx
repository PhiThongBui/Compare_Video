import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Phía Sau Sân Cỏ — Studio Render Video So Sánh",
  description: "Bảng điều khiển tự động hóa sản xuất video so sánh kiến thức bóng đá cho Facebook Reels / TikTok",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`dark ${beVietnam.variable} h-full`}>
      <body className="min-h-full bg-[#05130E] text-[#EBF8F2] antialiased selection:bg-[#FFD200] selection:text-[#081C15]">
        {children}
      </body>
    </html>
  );
}
