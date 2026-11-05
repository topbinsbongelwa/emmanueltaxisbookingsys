"use client";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-branding">
        <span className="copyright-badge" aria-hidden="true">C</span>
        <p className="footer-copy">
          © {year} Emmanuel Taxis &amp; Tours. All rights reserved. ·{" "}
          <a href="/terms">Terms &amp; Cookies</a>
        </p>
      </div>
      <p className="footer-credit">Developed by topbins⛳ · Bongelwa Ndlovu🐘</p>
    </footer>
  );
}
