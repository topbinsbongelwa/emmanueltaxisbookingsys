"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem("cookie_ok") !== "true");
    } catch {
      setVisible(true);
    }
  }, []);

  function acceptCookies() {
    try {
      localStorage.setItem("cookie_ok", "true");
    } catch {
      // The banner can still be dismissed for this visit if storage is unavailable.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="cookie-banner" role="dialog" aria-labelledby="cookie-banner-message">
      <p id="cookie-banner-message">
        We use one essential cookie to keep you signed in. We do not use advertising or
        tracking cookies. <a href="/terms#cookies">Read about cookies</a>.
      </p>
      <button type="button" onClick={acceptCookies}>OK, got it</button>
    </aside>
  );
}
