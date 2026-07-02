// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import InstallPrompt from "@/components/ui/InstallPrompt";

export const metadata: Metadata = {
  title: "Book Jimmy's — Liberia Weekly Challenge",
  description:
    "Test your knowledge of Liberia every week. Compete on the live leaderboard. Rise through the ranks. Become a champion.",
  keywords: [
    "Liberia",
    "quiz",
    "trivia",
    "weekly challenge",
    "leaderboard",
    "education",
  ],
  authors: [{ name: "EED", url: "https://eedickson.github.io/eed_portfolio/" }],
  creator: "Eric Edwin Dickson",

  // PWA manifest
  manifest: "/manifest.json",

  // Open Graph — controls how the link looks when shared on WhatsApp/Facebook
  openGraph: {
    title: "Book Jimmy's — Liberia Weekly Challenge",
    description:
      "Test your knowledge of Liberia every week. Compete on the live leaderboard.",
    url: "https://book-jimmys.vercel.app",
    siteName: "Book Jimmy's",
    locale: "en_US",
    type: "website",
  },

  // Icons
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },

  // Prevent search engines from indexing while still in soft launch
  // Remove this line when you are ready for public launch
  // robots: 'noindex',
};

export const viewport: Viewport = {
  themeColor: "#0b1f3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA meta tags */}
        <meta name="application-name" content="Book Jimmy's" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Book Jimmy's" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0b1f3a" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Apple touch icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

        {/* Register service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .catch(function(err) { console.log('SW registration failed:', err); });
              });
            }
          `,
          }}
        />
      </head>
      <body className="bg-[#0b1f3a] antialiased">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
