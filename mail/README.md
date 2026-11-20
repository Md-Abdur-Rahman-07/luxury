# Luxury inquiry forms

`mail.php` accepts the homepage journey request and Contact concierge inquiry. It requires PHP 8.1+ and the bundled PHPMailer library. The site works on a PHP-capable host; a static-only preview cannot deliver email.

Set these variables in your hosting environment (PHP `getenv` must be able to read them):

| Variable | Value |
| --- | --- |
| `SMTP_USERNAME` | Your SMTP account username |
| `SMTP_PASSWORD` | Your SMTP account password or provider app password |
| `SMTP_FROM` | A sender address authorized by that account; defaults to `example@gmail.com` |
| `SMTP_HOST` | Optional; defaults to `smtp.gmail.com` |
| `SMTP_PORT` | Optional; `587` for STARTTLS (default), or `465` for implicit TLS |

All inquiries are delivered to **example@gmail.com**. The sender display name is **Luxury**; replies go to the guest. Never commit SMTP credentials. No `.env` file is automatically loaded.

Both forms require `name`, `email`, `consent=1`, and an empty `website` honeypot. Contact inquiries send `form_kind=contact` and a message of at least 10 characters as `add`. Journey requests send `form_kind=quote`, `type` (`Hourly`, `Round Trip`, or `One Way`), `phone`, a future `datetime` in Austin/Central Time, integer `passanger`, `pickup`, and `dropoff`. Optional fields are `long` (hours), `addTrip`, and `add`. The legacy `passanger` spelling is retained for compatibility.

Requests with `Accept: application/json` receive `{ "ok": true|false, "message": "...", "errors": { ... } }`; the errors object appears only for validation failures. Without JavaScript, POST requests redirect to the corresponding form using a fixed local destination and a `status` query parameter: `success`, `validation-error`, `service-unavailable`, or `delivery-error`.

The handler returns a success response only after SMTP accepts the message. Missing SMTP configuration returns HTTP 503 with an email fallback. Validation returns HTTP 422; unsupported methods return HTTP 405. Delivery can only be verified after hosting credentials are configured. Do not use live submissions as an automated check.
