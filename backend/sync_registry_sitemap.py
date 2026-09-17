"""
Sitemap Sync Script for Ministry of Coal Resource Registry.
Compares the official coal.gov.in sitemap against our local registry
and reports new, removed, or changed resources.

Usage:
  python sync_registry_sitemap.py
"""

import json
import os
import sys
import re
import urllib.request
import ssl
from html.parser import HTMLParser


REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "app", "core", "registry.json")
FRONTEND_REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "data", "registry.json")
SITEMAP_URL = "https://coal.gov.in/sitemap"


class SitemapParser(HTMLParser):
    """Parse the coal.gov.in sitemap HTML to extract links."""
    
    def __init__(self):
        super().__init__()
        self.links = []
        self._in_sitemap = False
        self._in_a = False
        self._current_href = None
        self._current_text = ""
    
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "div" and "sitemap" in attrs_dict.get("class", ""):
            self._in_sitemap = True
        if self._in_sitemap and tag == "a":
            self._in_a = True
            self._current_href = attrs_dict.get("href", "")
            self._current_text = ""
    
    def handle_data(self, data):
        if self._in_a:
            self._current_text += data
    
    def handle_endtag(self, tag):
        if self._in_a and tag == "a":
            self._in_a = False
            title = self._current_text.strip()
            href = self._current_href or ""
            if title and href:
                if href.startswith("/"):
                    href = "https://coal.gov.in" + href
                self.links.append({"title": title, "url": href})


def fetch_sitemap():
    """Fetch and parse the official sitemap."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(SITEMAP_URL)
    req.add_header("User-Agent", "CMPDI-DocumentAI-SitemapSync/1.0")
    
    resp = urllib.request.urlopen(req, timeout=30, context=ctx)
    html = resp.read().decode("utf-8", errors="replace")
    
    parser = SitemapParser()
    parser.feed(html)
    return parser.links


def main():
    print("=== CMPDI Document AI — Sitemap Sync ===")
    print(f"Fetching official sitemap from: {SITEMAP_URL}")
    
    try:
        sitemap_links = fetch_sitemap()
    except Exception as e:
        print(f"ERROR: Failed to fetch sitemap: {e}")
        sys.exit(1)
    
    print(f"Found {len(sitemap_links)} links in official sitemap")
    
    # Load current registry
    if not os.path.exists(REGISTRY_PATH):
        print(f"Registry not found at: {REGISTRY_PATH}")
        sys.exit(1)
    
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        registry = json.load(f)
    
    print(f"Current registry has {len(registry)} entries")
    print()
    
    # Build sets for comparison
    registry_urls = {item["officialUrl"] for item in registry}
    sitemap_urls = {link["url"] for link in sitemap_links}
    
    # Find new URLs (in sitemap but not in registry)
    new_urls = sitemap_urls - registry_urls
    # Find removed URLs (in registry but not in sitemap)
    removed_urls = registry_urls - sitemap_urls
    # Shared
    shared_urls = registry_urls & sitemap_urls
    
    print(f"=== Comparison Results ===")
    print(f"  Shared (unchanged): {len(shared_urls)}")
    print(f"  New in sitemap:     {len(new_urls)}")
    print(f"  Removed from site:  {len(removed_urls)}")
    print()
    
    if new_urls:
        print("--- NEW RESOURCES (candidates for addition) ---")
        for url in sorted(new_urls):
            title = next((l["title"] for l in sitemap_links if l["url"] == url), "Unknown")
            print(f"  + {title}")
            print(f"    {url}")
        print()
    
    if removed_urls:
        print("--- REMOVED/CHANGED RESOURCES (flagged for review) ---")
        for url in sorted(removed_urls):
            title = next((item["title"] for item in registry if item["officialUrl"] == url), "Unknown")
            print(f"  - {title}")
            print(f"    {url}")
        print()
    
    if not new_urls and not removed_urls:
        print("Registry is fully in sync with the official sitemap.")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
