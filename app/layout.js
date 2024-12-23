import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Welth",
  description: "The future of wealth management",
};

export default function RootLayout({ children }) {
  return (
   <ClerkProvider>
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Header />
        {children}
        <footer className="bg-blue-50 py-12">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p>Made with 💗 by TK</p>
          </div>
        </footer>
      </body>
    </html>
   </ClerkProvider>
  );
}
