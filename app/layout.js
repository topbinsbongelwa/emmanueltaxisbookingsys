import "./globals.css";
import CookieBanner from "../components/CookieBanner";
import Footer from "../components/Footer";

export const metadata = { title: "Emmanuel Tours & Transfers | Victoria Falls", icons: { icon: "/logo.png" } };

export default function Root({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
