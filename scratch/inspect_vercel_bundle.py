import urllib.request
import re

url = "https://sih-26023-flame.vercel.app/login"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode("utf-8")
        print("HTML length:", len(html))
        js_files = re.findall(r'src="([^"]+\.js)"', html)
        print("JS files count:", len(js_files))
        
        for js_file in js_files:
            js_url = f"https://sih-26023-flame.vercel.app{js_file}" if js_file.startswith("/") else js_file
            try:
                with urllib.request.urlopen(urllib.request.Request(js_url, headers={"User-Agent": "Mozilla/5.0"})) as js_resp:
                    js_text = js_resp.read().decode("utf-8")
                    if "loca.lt" in js_text or "api/auth" in js_text or "8000" in js_text:
                        print(f"\n--- Found auth logic in {js_file} ---")
                        urls = set(re.findall(r'https?://[a-zA-Z0-9\.\-:\/]+', js_text))
                        print("URLs found in chunk:", urls)
            except Exception as e:
                print(f"Error fetching {js_file}: {e}")
except Exception as e:
    print("Error fetching login page:", e)
