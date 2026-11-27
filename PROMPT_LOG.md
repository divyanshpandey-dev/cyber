# Prompt Log 
Prompt 1 : Don't write any code yet. Read PROJECT_SPEC.md carefully. Give me: (1) the exact file list and what each file contains, (2) the build order in 5 small slices where each slice can be tested on its own, (3) the 3 riskiest parts and how you'd handle them, and (4) anything in the spec that is unclear or conflicting. Keep it short.
Prompt 2: Answers to your questions:
1. PROJECT_SPEC.md and PROMPT_LOG.md may exist in addition to the listed files. Leave PROMPT_LOG.md untouched and update README.md later.
2. Phone normalization: digits only, but if an Indian number has a 91 or 0 prefix, reduce it to the last 10 digits, so +91 98765 43210 and 9876543210 get the same placeholder.
3. Yes, map IPV4 to IP_ and CREDIT_CARD to CARD_ explicitly.
4. Default download extension is .txt.
All files must be created inside the cyber/ folder, which is the git repo root.

Now implement only Slice 1: js/detectors.js and tests.html, following PROJECT_SPEC.md. Use classic scripts (no import/export). detectors.js must expose a global detectAll(text) that returns an array of {type, start, end, value} after validation and overlap resolution, plus a global luhnCheck(digits). tests.html loads detectors.js and shows a pass/fail list for: Luhn valid (4111 1111 1111 1111) and invalid (4111 1111 1111 1112), IPv4 999.1.1.1 rejected, overlapping matches resolved, PAN and Aadhaar formats. Don't touch any other file. When done, list the files you changed and how I can run the tests.
Prompt 3: Implement only Slice 2: create js/redact.js and extend tests.html (add a script tag for redact.js and new assertions). Do not touch any other file. Use classic scripts (no import/export).

redact.js must expose a global function redactText(text, entities, mode) where entities is the array from detectAll(text) and mode is 'full', 'partial' or 'pseudo'. It returns an object: { output: string, segments: [{text, type}] , mapping: [{placeholder, original, type}] }. segments is the sanitized output split into pieces; pieces that replaced a detected entity have type set to the entity type, other pieces have type null. Also expose a global function countByType(entities) returning an object like {EMAIL: 2, PHONE: 1, ...}.

Rules, following PROJECT_SPEC.md:
- full: every match becomes [REDACTED].
- partial: keep the last 4 alphanumeric characters and replace the rest with X, keeping separators (4111 1111 1111 1111 becomes XXXX XXXX XXXX 1111). Email: first character + *** + the domain (john@example.com becomes j***@example.com). IPv4: XXX.XXX.XXX.<last octet>.
- pseudo: placeholders EMAIL_01, PHONE_01, IP_01, PAN_01, AADHAAR_01, CARD_01, numbered per type in order of first appearance. The same normalised value always gets the same placeholder (emails lowercased; phone, card and Aadhaar reduced to digits; phone with a 91 or 0 prefix reduced to the last 10 digits). mapping lists each unique placeholder once.

Add tests for: full mode, partial mode on a card, an email and an IP, the same email in different cases getting the same placeholder, two different emails getting EMAIL_01 and EMAIL_02, and +91 98765 43210 and 9876543210 getting the same PHONE_01. When done, list the files you changed.
Prompt 5 : Implement the UI: create index.html, style.css and js/app.js. Do NOT modify js/detectors.js, js/redact.js or tests.html. Use classic scripts only (no import/export), loaded in this order: detectors.js, redact.js, app.js. No external libraries, fonts or network requests.

Use the existing globals detectAll(text), redactText(text, entities, mode) and countByType(entities).

Layout:
- Header with the title "PII Sanitizer" and a visible badge: "Processed locally. Nothing leaves your browser."
- Input area: a textarea for pasted text, a file input (accept .txt,.csv), a "Load sample" button, a "Clear" button, and three radio buttons for mode: Full Mask, Partial Mask, Pseudonymize.
- A counts bar showing a count per entity type (with a colour legend) and a total.
- Two panels side by side: left "Original" shows the input text with every detection highlighted in a colour per type; right "Sanitized" shows the output from redactText with the replaced parts highlighted in the same colours. Use white-space: pre-wrap so line breaks are kept. On narrow screens stack them.
- A "Download sanitized file" button above the right panel.
- When mode is Pseudonymize, show the mapping table (placeholder, original, type) under the panels. Hide it in other modes.
- Show a friendly empty state when there is no text.

Behaviour:
- Everything updates live when the text or the mode changes (debounce about 150 ms).
- SECURITY: never put user text into innerHTML. Build the highlighted views with document.createTextNode and <mark> elements only.
- File upload: read with FileReader.readAsText and put the content in the textarea. Do not parse CSV. If the file is larger than 5 MB, show a warning and do not load it.
- "Load sample" fills the textarea with noisy sample text that includes: a valid Luhn card (4111 1111 1111 1111), a fake 16-digit order ID that fails Luhn, the same email twice in different cases, a valid IP and an invalid IP (999.1.1.1), a PAN, an Aadhaar, and two phone formats (+91 98765 43210 and 9876543210).
- Download: save the sanitized text with a Blob and a temporary link. File name is sanitized_<original name> using the uploaded file's extension, or sanitized.txt if the text was pasted or loaded from the sample.
- Make it look clean and professional with a simple dark or light theme, good spacing and readable highlight colours.

When done, list the files you created and how to run it.
Prompt 6 : Test the app end to end and report. Open index.html in a browser (use your browser tool if available; otherwise test the logic in Node without adding any files or dependencies to the repo). Do NOT change any code yet. Check each item and report PASS or FAIL with evidence (what you saw):

1. Click "Load sample": highlights appear on the left, sanitized text on the right, counts shown.
2. Switch to Full, Partial and Pseudonymize: the right side changes each time.
3. The fake 16-digit order ID that fails Luhn is NOT highlighted. The valid card 4111 1111 1111 1111 IS highlighted.
4. The same email in different cases gets the same placeholder in Pseudonymize mode.
5. 999.1.1.1 is NOT flagged; a valid IP is flagged.
6. +91 98765 43210 and 9876543210 are both flagged and share one placeholder in Pseudonymize mode.
7. Partial mode: the card shows XXXX XXXX XXXX 1111, the email shows as j***@domain, the IP shows XXX.XXX.XXX.<last octet>.
8. Pasting text containing <b>test</b> and <script>alert(1)</script> shows it as plain text and nothing runs.
9. Uploading a small .txt file loads it, and Download produces sanitized_<name>.txt with the sanitized content.
10. No network requests are made after the page loads, and nothing is written to localStorage or cookies.
11. tests.html: all assertions pass.

After the report, fix ONLY the items that FAILED, with the smallest possible change. Don't refactor or restyle anything. List every file and line you changed.