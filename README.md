PROJECT: PII Sanitizer. A browser-only tool that detects and redacts PII in text.

HARD CONSTRAINTS
- Plain HTML, CSS and vanilla JavaScript only. No frameworks, no build step, no backend.
- No network requests of any kind. No external scripts, CDNs, fonts or analytics. Everything runs offline in the browser.
- Do not store the user's text anywhere (no localStorage, no cookies).
- Create only these files: index.html, style.css, js/detectors.js, js/redact.js, js/app.js, tests.html, README.md. Do not create any others.
- Use classic <script> tags, not ES modules, so index.html works when opened directly from the file system.

ENTITIES AND DETECTION RULES
- EMAIL: standard email pattern, case-insensitive.
- PHONE: Indian mobiles (optional +91, 91 or 0 prefix, optional space or hyphen, 10 digits starting 6-9), plus international numbers that start with + and have 8-15 digits.
- IPV4: four octets, each 0-255. 999.1.1.1 must NOT match. IPv6 is out of scope.
- PAN: 5 letters, 4 digits, 1 letter (AAAAA9999A). The 4th letter must be one of P, C, H, F, A, T, B, L, J, G.
- AADHAAR: 12 digits, first digit 2-9, written plain or grouped as 4-4-4 with spaces or hyphens. Format check only.
- CREDIT_CARD: 13-19 digits, optionally grouped with spaces or hyphens. Flag ONLY if it passes the Luhn check. A random 16-digit number that fails Luhn must not be flagged.

OVERLAP RULE
Collect all candidates with start and end positions. If two overlap, keep the longer one. If equal length, use this priority: CREDIT_CARD, EMAIL, PAN, AADHAAR, IPV4, PHONE. Discard the loser entirely.

REDACTION MODES (user can switch live)
1. Full Mask: replace every match with [REDACTED].
2. Partial Mask: keep the last 4 alphanumeric characters and replace the rest with X, keeping the separators. Card: XXXX-XXXX-XXXX-1234. Email: first character, then ***, then the domain (j***@gmail.com). IPv4: keep only the last octet (XXX.XXX.XXX.20).
3. Consistent Pseudonymization: per-type placeholders EMAIL_01, PHONE_01, IP_01, PAN_01, AADHAAR_01, CARD_01. The same normalised value always gets the same placeholder in the whole document. Normalise emails to lowercase and phone, card and Aadhaar numbers to digits only. Show the mapping table.

UI
- Textarea for pasted text, plus upload for .txt and .csv (read as plain text with FileReader; do not parse CSV structure).
- A "Load sample" button that fills in noisy sample text. The sample must include: a valid Luhn card, a fake 16-digit order ID that fails Luhn, the same email twice in different cases, a valid IP and an invalid one (999.1.1.1), a PAN, an Aadhaar, and two phone formats.
- Side-by-side view: original with highlighted detections (colour per type) on the left, sanitized output on the right. Update live as the user types.
- Show detection counts per entity type and a total.
- A "Download sanitized file" button that saves the output with the same extension as the input.
- A visible note that nothing leaves the browser.
- ALWAYS escape the user's text before inserting it into the page. Never use raw innerHTML with user text.

TESTS
- tests.html runs simple assertions for: Luhn valid and invalid, IPv4 bounds, overlap resolution, pseudonym consistency.

OUT OF SCOPE
Login, backend, IPv6, names or addresses detection, machine learning, saving history.
The Vercel Deployed link : https://cyber-three-snowy.vercel.app/
