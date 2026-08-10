import "./globals.css";
import React from "react";

export const metadata = {
  title: "Local PDF RAG Application",
  description: "Learn RAG architecture using Next.js, Node.js, and Ollama",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
