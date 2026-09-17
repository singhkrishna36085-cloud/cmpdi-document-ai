"""
URL Verification Script for Ministry of Coal Resource Registry.
Validates all URLs in the registry by checking:
  - URL exists
  - HTTPS protocol
  - Domain is coal.gov.in (or other official govt domains)
  - HTTP response is successful (status 200-399)

Usage:
  python verify_registry_urls.py
"""

import json
import os
import sys
import urllib.request
import urllib.error
import ssl
from urllib.parse import urlparse

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "app", "core", "registry.json")
FRONTEND_REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "data", "registry.json")

ALLOWED_DOMAINS = [
    "coal.gov.in",
    "rti.gov.in",
    "sansad.in",
    "www.pib.gov.in",
    "www.mstcecommerce.com",
    "pmgatishakti.gov.in",
    "coal.pmgatishakti.gov.in",
]


def verify_url(url: str, timeout: int = 15) -> dict:
    """Verify a single URL. Returns verification result dict."""
    result = {
        "url": url,
        "is_https": False,
        "domain_ok": False,
        "reachable": False,
        "status_code": None,
        "error": None,
        "verified": False,
    }

    # Check HTTPS
    parsed = urlparse(url)
    result["is_https"] = parsed.scheme == "https"
    
    # Check domain
    domain = parsed.hostname or ""
    result["domain_ok"] = any(domain == d or domain.endswith("." + d) for d in ALLOWED_DOMAINS)

    if not result["is_https"]:
        result["error"] = "Not HTTPS"
        return result

    if not result["domain_ok"]:
        result["error"] = f"Domain {domain} not in allowed list"
        return result

    # Try to reach the URL (use GET since coal.gov.in blocks HEAD requests)
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        req.add_header("Accept", "text/html,application/xhtml+xml")
        resp = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        result["status_code"] = resp.getcode()
        resp.read(200)  # Read a small portion to confirm
        resp.close()
        result["reachable"] = True
        result["verified"] = 200 <= resp.getcode() < 400
    except urllib.error.HTTPError as e:
        result["status_code"] = e.code
        result["reachable"] = True
        result["error"] = f"HTTP {e.code}"
    except urllib.error.URLError as e:
        result["error"] = str(e.reason)
    except Exception as e:
        result["error"] = str(e)

    return result


def main():
    if not os.path.exists(REGISTRY_PATH):
        print(f"Registry not found at: {REGISTRY_PATH}")
        sys.exit(1)

    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        registry = json.load(f)

    print(f"=== CMPDI Document AI — Registry URL Verification ===")
    print(f"Total entries: {len(registry)}")
    print()

    verified_count = 0
    failed_count = 0
    skipped_count = 0

    for i, item in enumerate(registry):
        url = item.get("officialUrl", "")
        title = item.get("title", "Unknown")

        if not url:
            skipped_count += 1
            continue

        result = verify_url(url)
        status_icon = "✓" if result["verified"] else "✗"

        if result["verified"]:
            verified_count += 1
            item["verified"] = True
        else:
            failed_count += 1
            item["verified"] = False

        status_msg = f"[{i+1:3d}/{len(registry)}] {status_icon} {title}"
        if result["error"]:
            status_msg += f"  ({result['error']})"
        if result["status_code"]:
            status_msg += f"  [HTTP {result['status_code']}]"
        print(status_msg)

    print()
    print(f"=== Results ===")
    print(f"  Verified:  {verified_count}")
    print(f"  Failed:    {failed_count}")
    print(f"  Skipped:   {skipped_count}")
    print(f"  Total:     {len(registry)}")

    # Write updated registry back
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)
    print(f"\nUpdated registry saved to: {REGISTRY_PATH}")

    # Also update frontend copy
    if os.path.exists(os.path.dirname(FRONTEND_REGISTRY_PATH)):
        with open(FRONTEND_REGISTRY_PATH, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=2)
        print(f"Updated frontend registry saved to: {FRONTEND_REGISTRY_PATH}")

    return 0 if failed_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
