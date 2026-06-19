# Videography Outreach Mailer

A small Python tool that sends personalised outreach emails to local businesses
via your Gmail account. Built for offering free portfolio videography work.

**Safe by default:** running it with no flags does a *dry run* — it prints every
email it *would* send and sends nothing. You must add `--send` to deliver mail.

---

## What you do once (≈20–30 min)

### 1. Install Python deps
From this folder:
```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Enable the Gmail API and get credentials
1. Go to https://console.cloud.google.com/ and create a project (any name).
2. In the search bar, open **Gmail API** and click **Enable**.
3. Go to **APIs & Services → OAuth consent screen**. Choose **External**, fill in
   the app name and your email, and add yourself as a **Test user**. (You can keep
   it in "Testing" mode — no Google review needed for personal use.)
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   Choose **Desktop app**. Download the JSON.
5. Rename that file to **`credentials.json`** and put it in this folder.

> `credentials.json` and the `token.json` created on first run are secrets.
> They are already in `.gitignore` — never commit them.

### 3. Fill in your recipients
Edit `businesses.csv`. Columns:
- `business_name` (required)
- `email` (required)
- `contact_name` (optional — blank becomes "there")
- `personal_note` (optional — a specific detail that makes the email feel real)

### 4. Edit the template
Open `email_template.txt` and replace `[your phone]` and `[your website or
Instagram]` with your real details. Tweak the wording however you like. The first
`Subject:` line is the subject; everything below is the body. Placeholders in
`{curly_braces}` are filled from the CSV columns.

---

## Running it

```bash
python send_outreach.py            # DRY RUN — prints every email, sends nothing
python send_outreach.py --send     # actually send (browser asks you to log in once)
python send_outreach.py --send --limit 10   # send at most 10 this run
```

On the first `--send`, a browser window opens for you to authorise your Google
account. After that a `token.json` is saved and you won't be asked again.

### Built-in guardrails
- **Daily cap** of 30 emails (`DAILY_CAP` in the script) to protect deliverability.
- **Throttle** of 45–90s between sends so it doesn't look like a blast.
- **Dedup**: everyone successfully emailed is recorded in `sent_log.csv` and
  skipped on future runs, so re-running is always safe.

---

## A note on the law (you're in Australia)
The Spam Act 2003 applies to commercial emails. This tool is set up to comply:
it identifies you and includes an unsubscribe line. To stay on the right side of
it, only email businesses whose contact address is **publicly listed**, keep
volumes modest, and honour any "unsubscribe" reply immediately (remove them from
the CSV / mark them in the log). This isn't legal advice — when in doubt, check
the ACMA guidance on commercial electronic messages.

---

## Files
| File | What it is |
|------|------------|
| `send_outreach.py` | the mailer |
| `email_template.txt` | subject + body with `{placeholders}` |
| `businesses.csv` | your recipient list |
| `requirements.txt` | Python dependencies |
| `sent_log.csv` | auto-created record of sends (gitignored) |
| `credentials.json` / `token.json` | your Gmail secrets (gitignored, you provide) |
