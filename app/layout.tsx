import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PetOtelim",
  description: "Pet Otel Yonetim Sistemi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" style={{height:'100%'}}>
      <body style={{height:'100%',margin:0,padding:0,backgroundColor:'#F2F2F7',fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif'}}>{children}</body>
    </html>
  );
}