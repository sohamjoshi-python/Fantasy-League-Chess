#!/usr/bin/env python3
"""Email the current snake-draft picker via the deployed send-resend-email function."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from html import escape

SITE_URL = "https://fantasyleaguechess.com"
LOGO_URL = f"{SITE_URL}/assets/fantasy-league-chess-logo-updated.png"
TURN_TIMEOUT_HOURS = 12
TEST_FIVE_MINUTE_DRAFT_LEAGUE_IDS = {
    "1465e20b-f06b-4a89-8e3f-d675759af0c4",
    "2f17a311-69ef-40ed-b7ad-10ce95dc0210",
}


def timeout_label(league_id: str | None) -> str:
    if league_id in TEST_FIVE_MINUTE_DRAFT_LEAGUE_IDS:
        return "5 minutes"
    return f"{TURN_TIMEOUT_HOURS} hours"


def require_env() -> tuple[str, str]:
    base_url = (os.environ.get("SB_URL") or "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SB_KEY") or ""
    if not base_url or not service_key:
        raise SystemExit("Missing SB_URL and SUPABASE_SERVICE_ROLE_KEY (or SB_KEY)")
    return base_url, service_key


def request_json(method: str, url: str, service_key: str, body: dict | None = None):
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
    }
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed ({error.code}): {details}") from error


def create_email(recipient_name: str, league_name: str, league_id: str, extras: dict | None = None) -> dict:
    extras = extras or {}
    league_url = f"{SITE_URL}/league/{league_id}"
    turn_timeout = extras.get("timeoutLabel") or timeout_label(league_id)
    heading = extras.get("heading") or "Your 1st Round Pick"
    picks_html = extras.get("picksHtml") or ""
    picks_text = extras.get("picksText") or ""
    subject = f"{heading} in {league_name}"
    text_parts = [
        f"Hi {recipient_name},",
        f"{heading} in the draft for {league_name}.",
        (
            f"You have {turn_timeout} to buy a player. If you don't pick, "
            "this turn is skipped and you can still add players later in the regular marketplace."
        ),
    ]
    if picks_text.strip():
        text_parts.append(f"Picks so far:\n{picks_text.strip()}")
    text_parts.append(f"Make your pick: {league_url}")
    text = "\n\n".join(text_parts)
    picks_block = ""
    if picks_html.strip():
        picks_block = (
            '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; '
            'padding: 18px; margin: 0 0 22px;"><p style="margin: 0 0 12px; font-weight: bold;">Picks so far</p>'
            f"{picks_html}</div>"
        )
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="{LOGO_URL}" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">{escape(heading)}</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi {escape(recipient_name)},</p>
            <p style="margin: 0 0 18px;">It's time for your pick in <strong>{escape(league_name)}</strong>.</p>
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 18px; margin: 22px 0;">
              <p style="margin: 0;"><strong>You have {escape(turn_timeout)}</strong> to buy a player. If you don't pick, this turn is skipped.</p>
            </div>
            {picks_block}
            <p style="margin: 0 0 24px;">You can still add players later in the regular marketplace after the snake draft ends.</p>
            <p style="margin: 30px 0; text-align: center;">
              <a href="{league_url}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Make Your Pick</a>
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


def send_email(base_url: str, service_key: str, recipient: dict, payload: dict) -> None:
    request_json(
        "POST",
        f"{base_url}/functions/v1/send-resend-email",
        service_key,
        {
            "to": recipient["email"],
            "subject": payload["subject"],
            "htmlContent": payload["htmlContent"],
            "textContent": payload["textContent"],
            "emailType": "custom",
            "userId": recipient["user_id"],
            "leagueId": recipient["league_id"],
            "metadata": {
                "source": "github_marketplace_turn",
                "turnNumber": recipient.get("turn_number"),
            },
        },
    )


def main() -> None:
    base_url, service_key = require_env()
    recipients = request_json(
        "POST",
        f"{base_url}/rest/v1/rpc/claim_marketplace_turn_emails",
        service_key,
        {},
    ) or []

    print(f"Pending marketplace-turn emails: {len(recipients)}")
    emails_sent = 0
    for recipient in recipients:
        email = recipient.get("email")
        if not email:
            continue
        name = recipient.get("username") or email.split("@")[0] or "there"
        league_name = recipient.get("league_name") or "your league"
        extras = request_json(
            "POST",
            f"{base_url}/rest/v1/rpc/get_marketplace_turn_email_extras",
            service_key,
            {
                "p_league_id": recipient["league_id"],
                "p_exclude_user_id": recipient.get("user_id"),
                "p_turn_number": recipient.get("turn_number"),
            },
        ) or {}
        payload = create_email(name, league_name, recipient["league_id"], extras)
        try:
            send_email(base_url, service_key, recipient, payload)
        except Exception:
            request_json(
                "PATCH",
                f"{base_url}/rest/v1/leagues?id=eq.{recipient['league_id']}&marketplace_turn_email_sent_for=eq.{recipient.get('turn_number')}",
                service_key,
                {"marketplace_turn_email_sent_for": None},
            )
            raise
        emails_sent += 1
        print(f"Sent turn email to {email} for {league_name}")

    print(json.dumps({"turn_emails": emails_sent}))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise
