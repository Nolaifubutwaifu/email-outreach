# Outreach Toolkit

> **Sending account:** every email from this project is always sent from
> **maximilianumschaden@gmail.com**. That is the only account this toolkit uses —
> the Gmail credentials, drafts, and sent mail all belong to it. No other address
> is involved in this project.

Two ways to send free-shoot outreach to local businesses from your Gmail account
(**maximilianumschaden@gmail.com**):

1. **Web app (recommended)** — *Photography Outreach Manager*. Paste a batch of
   website links, auto-scrape each business's email + Instagram + Facebook, review
   the list, and create a **Gmail draft** for each with one click. Tracks who you've
   contacted and when in `contacts.csv`. → [Web app](#web-app)
2. **Command-line sender** — the original `send_outreach.py`: reads `businesses.csv`
   and sends a templated email directly (dry-run by default).
   → [Command-line sender](#command-line-sender)

Both use your Gmail account and share the one-time Gmail API setup below.

---

## One-time setup (≈20–30 min)

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
   the app name and use **maximilianumschaden@gmail.com**, and add that same
   address as a **Test user**. (Keep it in "Testing" mode — no Google review
   needed for personal use.) Always authorise as
   **maximilianumschaden@gmail.com** when the browser opens on first run — that is
   the account mail is sent from.
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   Choose **Desktop app**. Download the JSON.
5. Rename that file to **`credentials.json`** and put it in this folder.

> `credentials.json` and the `token.json` created on first run are secrets.
> They're in `.gitignore` — never commit them.

---

## Web app

*Photography Outreach Manager* — a local browser app, and the fastest way to use this.

**Run it:**
```bash
.venv/bin/python app.py
```
Then open **http://127.0.0.1:5050** (set `PORT=8000` etc. to change the port).

**What it does**
- **From websites** — paste a batch of site links (one per line); it scrapes each
  business's name, email, Instagram and Facebook. Review/edit the results, then add
  them to your list.
- **Bulk paste / Single** — add contacts from `Name, email` lines or one at a time.
- **Create draft (or send)** — one click puts a ready-to-send email in your
  **Gmail Drafts** to review. Flip the **Draft / Send** toggle to send immediately
  instead — drafts are the default and safer. Works per-business or for the whole
  "to send" list at once.
- **Tracking** — everything is saved to `contacts.csv` with a status
  (*To send / Drafted / Sent / Replied*) and the time a draft was created. Re-adding
  the same email is skipped, so your list never doubles up.

The first time you click **Create draft**, a browser opens to authorise Gmail. This
upgrades the permission to "create drafts" (the CLI uses send-only), so you'll
re-consent once. The email wording lives in `email_template.txt` and is editable
right in the app.

> The free scraper reads each site's own pages for a published email and social
> links. Some businesses hide their email behind a contact form — for those, just
> type the address into the review row before adding.

### Find businesses with Google Places (optional)

The **Find businesses** tab pulls a batch of businesses + their websites for an
area/category from Google Places, then scrapes each site for the email — so you go
from "a suburb + a category" straight to a list of leads. One-time setup:

1. In [Google Cloud Console](https://console.cloud.google.com/) (same project as
   your Gmail credentials), open **APIs & Services → Library**, search
   **Places API (New)**, and **Enable** it.
2. Turn on **billing**: **Billing → link a billing account** (add a card). Required
   even though normal personal use stays inside Google's free monthly tier.
3. **APIs & Services → Credentials → Create credentials → API key.** Copy the key.
   (Recommended: edit the key → **Restrict key → Places API (New)**.)
4. Paste the key into a file called **`places_api_key.txt`** in this folder
   (it's gitignored), or set the `GOOGLE_MAPS_API_KEY` environment variable.

Then restart the app. Google Places only returns name/website/phone/address — the
email always comes from scraping the business's own site, so leads with no website
(or no published email) will need the address typed in by hand.

---

## Command-line sender

The original tool. Sends the `email_template.txt` message directly to everyone in
`businesses.csv`. **Safe by default:** with no flags it does a *dry run* — prints
every email it *would* send and sends nothing. You must add `--send` to deliver.

```bash
python send_outreach.py            # DRY RUN — prints every email, sends nothing
python send_outreach.py --send     # actually send
python send_outreach.py --send --limit 10   # send at most 10 this run
```

Fill in `businesses.csv` first. Columns: `business_name`, `email`, `contact_name`
(optional), `personal_note` (optional). Placeholders in `{curly_braces}` in the
template are filled from these columns.

### Built-in guardrails
- **Daily cap** of 30 emails (`DAILY_CAP` in the script) to protect deliverability.
- **Throttle** of 45–90s between sends so it doesn't look like a blast.
- **Dedup**: everyone successfully emailed is recorded in `sent_log.csv` and skipped
  on future runs, so re-running is always safe.

---

## A note on the law (you're in Australia)
The Spam Act 2003 applies to commercial emails. Only email businesses whose contact
address is **publicly listed**, keep volumes modest, and honour any "unsubscribe"
reply immediately. This isn't legal advice — when in doubt, check the ACMA guidance
on commercial electronic messages.

---

## Files
| File | What it is |
|------|------------|
| `app.py` | the web app (Photography Outreach Manager) |
| `scraper.py` | free website contact scraper (email + socials) |
| `places.py` | find businesses via Google Places (New) |
| `gmail_client.py` | Gmail auth + draft creation |
| `index.html` | the web app's browser UI |
| `contacts.csv` | the web app's business list + status (auto-created, gitignored) |
| `send_outreach.py` | the command-line sender |
| `businesses.csv` | recipient list for the CLI sender |
| `email_template.txt` | subject + body, shared by both tools |
| `requirements.txt` | Python dependencies |
| `sent_log.csv` | CLI send record (auto-created, gitignored) |
| `credentials.json` / `token.json` | your Gmail secrets (gitignored, you provide) |
| `places_api_key.txt` | your Google Places API key (gitignored, you provide) |
