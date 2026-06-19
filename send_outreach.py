#!/usr/bin/env python3
"""
send_outreach.py
----------------
Personalised videography outreach mailer using the Gmail API.

Safe by default: running with no flags does a DRY RUN (renders and prints every
email but sends nothing). You must pass --send to actually deliver mail.

Features
  * Reads recipients from a CSV (businesses.csv)
  * Renders a template (email_template.txt) per recipient
  * Skips anyone already emailed (tracked in sent_log.csv) so re-runs are safe
  * Throttles between sends and enforces a daily cap to protect deliverability
  * Logs every send (and failure) with a timestamp

Usage
  python send_outreach.py                 # dry run, prints everything, sends nothing
  python send_outreach.py --send          # actually send
  python send_outreach.py --send --limit 10
  python send_outreach.py --csv mylist.csv --template my_template.txt

See README.md for one-time Gmail API setup.
"""

import argparse
import base64
import csv
import os
import random
import re
import sys
import time
from datetime import datetime, date
from email.mime.text import MIMEText
from pathlib import Path

# --- Configuration -----------------------------------------------------------
# These are sensible defaults. Override most of them with command-line flags.
DEFAULT_CSV = "businesses.csv"
DEFAULT_TEMPLATE = "email_template.txt"
SENT_LOG = "sent_log.csv"

DAILY_CAP = 30                 # max emails per calendar day (deliverability guard)
MIN_DELAY_SECONDS = 45         # minimum pause between real sends
MAX_DELAY_SECONDS = 90         # maximum pause between real sends

# Gmail API: read/write to send mail only.
SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE = "token.json"

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# --- Template handling --------------------------------------------------------
def load_template(path):
    """Load a template file. First non-blank 'Subject:' line is the subject;
    everything after it is the body."""
    text = Path(path).read_text(encoding="utf-8")
    lines = text.splitlines()
    subject = None
    body_start = 0
    for i, line in enumerate(lines):
        if line.strip().lower().startswith("subject:"):
            subject = line.split(":", 1)[1].strip()
            body_start = i + 1
            break
    if subject is None:
        raise ValueError(
            f"{path} must contain a line starting with 'Subject:' on its own line."
        )
    body = "\n".join(lines[body_start:]).lstrip("\n")
    return subject, body


def render(text, row):
    """Replace {placeholders} with CSV values. Missing/blank optional fields
    are handled gracefully so you never email '{contact_name}' literally."""
    out = text
    # Friendly greeting fallback: if contact_name is blank, use "there".
    safe = dict(row)
    if not safe.get("contact_name", "").strip():
        safe["contact_name"] = "there"
    for key, value in safe.items():
        out = out.replace("{" + key + "}", value.strip())
    # Strip any placeholders that had no column at all.
    out = re.sub(r"\{[a-zA-Z_]+\}", "", out)
    return out


# --- Sent-log (dedup) handling ------------------------------------------------
def load_already_sent(path):
    sent = set()
    if not Path(path).exists():
        return sent
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("status") == "sent" and r.get("email"):
                sent.add(r["email"].strip().lower())
    return sent


def count_sent_today(path):
    if not Path(path).exists():
        return 0
    today = date.today().isoformat()
    n = 0
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("status") == "sent" and r.get("timestamp", "").startswith(today):
                n += 1
    return n


def log_send(path, email, business, status, detail=""):
    new = not Path(path).exists()
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["timestamp", "email", "business_name", "status", "detail"])
        w.writerow([datetime.now().isoformat(timespec="seconds"),
                    email, business, status, detail])


# --- Gmail API ----------------------------------------------------------------
def gmail_service():
    """Authenticate and return a Gmail API service. Imports are local so a dry
    run works even before the Google libraries are installed."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    creds = None
    if Path(TOKEN_FILE).exists():
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not Path(CREDENTIALS_FILE).exists():
                sys.exit(
                    f"Missing {CREDENTIALS_FILE}. Download it from Google Cloud "
                    "(see README.md) and place it in this folder."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        Path(TOKEN_FILE).write_text(creds.to_json(), encoding="utf-8")
    return build("gmail", "v1", credentials=creds)


def build_message(to_addr, subject, body):
    msg = MIMEText(body, "plain", "utf-8")
    msg["to"] = to_addr
    msg["subject"] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return {"raw": raw}


def send_message(service, to_addr, subject, body):
    message = build_message(to_addr, subject, body)
    service.users().messages().send(userId="me", body=message).execute()


# --- Main ---------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(description="Personalised videography outreach mailer.")
    p.add_argument("--send", action="store_true",
                   help="Actually send. Without this flag it's a dry run.")
    p.add_argument("--csv", default=DEFAULT_CSV, help="Recipient CSV file.")
    p.add_argument("--template", default=DEFAULT_TEMPLATE, help="Email template file.")
    p.add_argument("--limit", type=int, default=None,
                   help="Max emails to process this run (after the daily cap).")
    p.add_argument("--no-throttle", action="store_true",
                   help="Disable the delay between sends (not recommended for real sends).")
    args = p.parse_args()

    if not Path(args.csv).exists():
        sys.exit(f"CSV not found: {args.csv}")
    subject_tpl, body_tpl = load_template(args.template)

    already = load_already_sent(SENT_LOG)
    sent_today = count_sent_today(SENT_LOG)
    remaining_today = max(0, DAILY_CAP - sent_today)

    mode = "SEND" if args.send else "DRY RUN"
    print(f"=== {mode} ===")
    print(f"Daily cap: {DAILY_CAP}  |  already sent today: {sent_today}  "
          f"|  remaining today: {remaining_today}")
    if args.send and remaining_today == 0:
        sys.exit("Daily cap already reached. Try again tomorrow or raise DAILY_CAP.")

    with open(args.csv, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    service = gmail_service() if args.send else None

    processed = 0
    skipped = 0
    failures = 0
    for row in rows:
        email = (row.get("email") or "").strip()
        business = (row.get("business_name") or "").strip()

        if not EMAIL_RE.match(email):
            print(f"  [skip] invalid/blank email for '{business or '?'}': '{email}'")
            skipped += 1
            continue
        if email.lower() in already:
            print(f"  [skip] already emailed: {email}")
            skipped += 1
            continue

        if args.send and processed >= remaining_today:
            print("  [stop] hit daily cap for this run.")
            break
        if args.limit is not None and processed >= args.limit:
            print("  [stop] hit --limit for this run.")
            break

        subject = render(subject_tpl, row)
        body = render(body_tpl, row)

        if not args.send:
            print("\n" + "-" * 60)
            print(f"TO:      {email}")
            print(f"SUBJECT: {subject}")
            print(body)
        else:
            try:
                send_message(service, email, subject, body)
                log_send(SENT_LOG, email, business, "sent")
                already.add(email.lower())
                print(f"  [sent] {email}")
            except Exception as e:  # noqa: BLE001 - log and continue
                log_send(SENT_LOG, email, business, "failed", str(e))
                failures += 1
                print(f"  [FAIL] {email}: {e}")
            if not args.no_throttle:
                delay = random.randint(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS)
                print(f"        ...waiting {delay}s")
                time.sleep(delay)

        processed += 1

    print("\n=== summary ===")
    print(f"processed: {processed}  skipped: {skipped}  failures: {failures}")
    if not args.send:
        print("\nThis was a DRY RUN. Re-run with --send to deliver these emails.")


if __name__ == "__main__":
    main()
