import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "স্বাস্থ্য গবেষণা সহকারী | Health Research Agent",
  description: "Personalized AI-powered medical research for patients of all ages | ব্যক্তিগতকৃত AI স্বাস্থ্য গবেষণা",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
