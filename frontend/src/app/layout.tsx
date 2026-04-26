import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Olives School Management System",
  description: "Comprehensive school management system for Olives Schools, Eldoret, Kenya. Manage students, fees, exams, attendance and more.",
  keywords: ["Olives School", "School Management", "Education", "Students", "Fees", "Exams", "Kenya", "CBC"],
  icons: {
    icon: '/favicon.ico.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
