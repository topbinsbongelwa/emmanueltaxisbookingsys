export const metadata = {
  title: "Terms & Cookies | Emmanuel Taxis & Tours",
};

export default function TermsPage() {
  return (
    <main className="terms-page">
      <h1>Terms &amp; Conditions</h1>
      <p className="terms-updated">Last updated: [last-updated date]</p>

      <section>
        <h2>Using the System</h2>
        <p>
          This system is provided for staff of [business name] to manage tour and
          transfer bookings. By using it, you agree to use it responsibly, follow
          your organisation&apos;s procedures, and keep your sign-in details secure.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <p>
          Staff accounts are for their assigned users only. Do not share your
          password or allow another person to use your signed-in account. Tell
          [business name] promptly if you suspect that your account has been
          accessed without permission.
        </p>
      </section>

      <section>
        <h2>Bookings and guest information</h2>
        <p>
          Booking information should be accurate and used only for the work
          required to manage a booking. Guest details are used only to arrange
          and confirm bookings. Treat guest details as confidential and do not
          disclose them to people who do not need them for that purpose.
        </p>
      </section>

      <section id="cookies">
        <h2>Cookies</h2>
        <p>
          The system uses one essential, httpOnly session cookie named
          <code> s</code> to keep staff signed in. It does not use advertising or
          tracking cookies. The cookie banner choice is saved in this browser&apos;s
          local storage as <code>cookie_ok</code>.
        </p>
      </section>

      <section>
        <h2>Copyright</h2>
        <p>
          The system&apos;s content and branding may not be copied or reused without
          permission from [business name], except where the law allows.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          [Business name] will take reasonable care to keep the system available
          and information accurate, but the system is provided as a tool and may
          occasionally be unavailable or contain errors. To the extent allowed
          by applicable law, [business name] is not responsible for indirect loss
          arising from use of the system. Nothing in these terms limits a right
          that cannot legally be limited.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          These terms may be updated when the system or its use changes. The
          latest version will be available on this page, with its update date
          shown above.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <address>
          [business name]<br />
          Email: [email]<br />
          Phone: [phone]<br />
          Address: [address]
        </address>
      </section>
    </main>
  );
}
