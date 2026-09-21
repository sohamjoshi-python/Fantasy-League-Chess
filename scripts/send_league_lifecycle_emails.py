#!/usr/bin/env python3
"""Send marketplace-start and league-start emails via send-resend-email."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html import escape
from zoneinfo import ZoneInfo

SITE_URL = "https://fantasyleaguechess.com"
LOGO_URL = f"{SITE_URL}/assets/fantasy-league-chess-logo-updated.png"


def require_env() -> tuple[str, str]:
    base_url = (os.environ.get("SB_URL") or "").rstrip("/")
    # The legacy names are kept only until the legacy keys are disabled.
    service_key = (
        os.environ.get("SB_SECRET_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SB_KEY")
        or ""
    )
    if not base_url or not service_key:
        raise SystemExit("Missing SB_URL and SB_SECRET_KEY")
    return base_url, service_key


def pacific_today() -> str:
    return datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()


def request_json(method: str, url: str, service_key: str, body: dict | None = None, extra_headers: dict | None = None):
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed ({error.code}): {details}") from error


def format_start_date(ymd: str | None) -> str:
    if not ymd or len(ymd) < 10:
        return "today"
    try:
        parsed = datetime.strptime(ymd[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return ymd
    return parsed.strftime("%B %d, %Y")


def create_marketplace_started_email(recipient_name: str, league_name: str, league_id: str) -> dict:
    title = "The Draft Is Open"
    headline = f"The snake draft for {league_name} has started."
    details = "Managers take turns buying chess players. You'll get another email when it's your turn. If you don't pick, that turn is skipped and you can still add players later in the regular marketplace."
    button_label = "Open Draft"
    league_url = f"{SITE_URL}/league/{league_id}"
    subject = f"The draft is open in {league_name}"
    text = "\n\n".join(
        [
            f"Hi {recipient_name},",
            headline,
            details,
            f"{button_label}: {league_url}",
        ]
    )
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="{LOGO_URL}" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">{escape(title)}</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi {escape(recipient_name)},</p>
            <p style="margin: 0 0 18px;">{escape(headline)}</p>
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 18px; margin: 22px 0;">
              <p style="margin: 0;">{escape(details)}</p>
            </div>
            <p style="margin: 30px 0; text-align: center;">
              <a href="{league_url}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">{escape(button_label)}</a>
            </p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #777777; padding: 0 24px 24px;">
            <p style="margin: 0;">&copy; 2026 Fantasy League Chess. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
    """
    return {"subject": subject, "htmlContent": html, "textContent": text}


def create_email(recipient_name: str, league_name: str, league_id: str, start_date: str | None) -> dict:
    title = "Your League Has Started"
    headline = f"{league_name} starts today."
    details = "Points start counting now. Set your weekly lineup and check the marketplace for trades."
    button_label = "Open League"
    league_url = f"{SITE_URL}/league/{league_id}"
    start_label = format_start_date(start_date)
    subject = f"{league_name} has started"
    text = "\n\n".join(
        [
            f"Hi {recipient_name},",
            headline,
            details,
            f"League: {league_name}",
            f"Start date: {start_label}",
            f"{button_label}: {league_url}",
        ]
    )
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="{LOGO_URL}" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">{escape(title)}</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi {escape(recipient_name)},</p>
            <p style="margin: 0 0 18px;">{escape(headline)}</p>
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 18px; margin: 22px 0;">
              <p style="margin: 0 0 8px;"><strong>League:</strong> {escape(league_name)}</p>
              <p style="margin: 0;"><strong>Start date:</strong> {escape(start_label)}</p>
            </div>
            <p style="margin: 0 0 24px;">{escape(details)}</p>
            <p style="margin: 30px 0; text-align: center;">
              <a href="{league_url}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">{escape(button_label)}</a>
            </p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #777777; padding: 0 24px 24px;">
            <p style="margin: 0;">&copy; 2026 Fantasy League Chess. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
    """
    return {"subject": subject, "htmlContent": html, "textContent": text}


def claim_league(base_url: str, service_key: str, league_id: str, column: str) -> bool:
    url = f"{base_url}/rest/v1/leagues?id=eq.{league_id}&{column}=is.null"
    updated = request_json(
        "PATCH",
        url,
        service_key,
        {column: datetime.now(timezone.utc).isoformat()},
        {"Prefer": "return=representation"},
    )
    return bool(updated)


def reset_claim(base_url: str, service_key: str, league_id: str, column: str) -> None:
    url = f"{base_url}/rest/v1/leagues?id=eq.{league_id}"
    request_json("PATCH", url, service_key, {column: None})


def load_recipients(base_url: str, service_key: str, member_ids: list[str]) -> list[dict]:
    unique_ids = [member_id for member_id in dict.fromkeys(member_ids) if member_id]
    if not unique_ids:
        return []
    encoded_ids = ",".join(unique_ids)
    users = request_json(
        "GET",
        f"{base_url}/rest/v1/users?id=in.({encoded_ids})&select=id,email,username",
        service_key,
    ) or []
    bots = request_json(
        "GET",
        f"{base_url}/rest/v1/bots?id=in.({encoded_ids})&select=id",
        service_key,
    ) or []
    bot_ids = {bot["id"] for bot in bots}
    return [
        user
        for user in users
        if user.get("email") and user.get("id") not in bot_ids
    ]


def send_email(base_url: str, service_key: str, to_email: str, user_id: str, league_id: str, event: str, payload: dict) -> None:
    request_json(
        "POST",
        f"{base_url}/functions/v1/send-resend-email",
        service_key,
        {
            "to": to_email,
            "subject": payload["subject"],
            "htmlContent": payload["htmlContent"],
            "textContent": payload["textContent"],
            "emailType": "custom",
            "userId": user_id,
            "leagueId": league_id,
            "metadata": {"source": "github_league_lifecycle", "event": event},
        },
    )


def process_leagues(base_url: str, service_key: str, leagues: list[dict], event: str, column: str) -> tuple[int, int]:
    emails_sent = 0
    leagues_notified = 0
    for league in leagues:
        league_id = league["id"]
        if not claim_league(base_url, service_key, league_id, column):
            print(f"Skipping {league_id}: already emailed for {event}")
            continue
        try:
            recipients = load_recipients(base_url, service_key, league.get("member_ids") or [])
            league_name = league.get("name") or "your league"
            for recipient in recipients:
                name = recipient.get("username") or recipient["email"].split("@")[0] or "there"
                payload = (
                    create_marketplace_started_email(name, league_name, league_id)
                    if event == "marketplace_started"
                    else create_email(name, league_name, league_id, league.get("start_date"))
                )
                send_email(base_url, service_key, recipient["email"], recipient["id"], league_id, event, payload)
                emails_sent += 1
                print(f"Sent {event} email to {recipient['email']} for {league_name}")
            leagues_notified += 1
        except Exception as error:
            print(f"Failed {event} for {league_id}: {error}", file=sys.stderr)
            reset_claim(base_url, service_key, league_id, column)
            raise
    return emails_sent, leagues_notified


def main() -> None:
    base_url, service_key = require_env()
    today = pacific_today()
    print(f"Sending league lifecycle emails as of {today} PT")

    draft_leagues = request_json(
        "GET",
        f"{base_url}/rest/v1/leagues?marketplace_started=eq.true&marketplace_started_email_sent_at=is.null&select=id,name,member_ids,start_date",
        service_key,
    ) or []

    print(f"Pending marketplace-start emails: {len(draft_leagues)}")

    draft_emails, draft_leagues_sent = process_leagues(
        base_url, service_key, draft_leagues, "marketplace_started", "marketplace_started_email_sent_at"
    )

    start_leagues = request_json(
        "GET",
        f"{base_url}/rest/v1/leagues?start_date=lte.{today}&league_started_email_sent_at=is.null&select=id,name,member_ids,start_date",
        service_key,
    ) or []

    print(f"Pending league-start emails: {len(start_leagues)}")

    start_emails, start_leagues_sent = process_leagues(
        base_url, service_key, start_leagues, "league_started", "league_started_email_sent_at"
    )

    print(
        json.dumps(
            {
                "marketplace_start_leagues": draft_leagues_sent,
                "marketplace_start_emails": draft_emails,
                "league_start_leagues": start_leagues_sent,
                "league_start_emails": start_emails,
            }
        )
    )


if __name__ == "__main__":
    main()
