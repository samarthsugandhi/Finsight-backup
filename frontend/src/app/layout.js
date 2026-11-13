import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import MotionProviders from "@/components/MotionProviders";
import PWARegister from "@/components/PWARegister";

export const metadata = {
  title: "Finsight — Clarity for your money",
  description:
    "AI-Powered Personal Finance and Decision Support Platform",
  applicationName: "FinSight",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.ico", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "FinSight", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#080b12" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <MotionProviders>{children}</MotionProviders>
            <PWARegister />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
