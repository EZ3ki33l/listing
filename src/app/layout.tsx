import type { Metadata } from "next";
import localFont from "next/font/local";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import { connection } from "next/server";
import { FeedbackProvider } from "@/components/Feedback";

const body = localFont({
  variable: "--font-body",
  src: [
    { path: "../fonts/coves-font/coves-light.otf", weight: "100 400" },
    { path: "../fonts/coves-font/coves-bold.otf", weight: "500 900" },
  ],
});

const label = Space_Mono({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Gestionnaire de listes d'achats",
  description: "Gérez vos listes d'achats facilement",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Rendu dynamique : le nonce CSP est propre à chaque requête
  await connection();
  return (
    <html lang="fr-FR">
      <body
        className={`${body.variable} ${label.variable} antialiased`}
      >
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
