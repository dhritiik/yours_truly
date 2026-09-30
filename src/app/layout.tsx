import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YoursTruly – Digital Wedding Invitations",
  description: "A premium, personalized digital wedding invitation platform. Beautiful templates, smart event masking, and real-time RSVP management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
