import urllib.request
import re
import time

def check_bundle():
    url = "https://sih-26023-flame.vercel.app/login"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Cache-Control": "no-cache"})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode("utf-8")
            js_files = re.findall(r'src="([^"]+\.js)"', html)
            for js_file in js_files:
                js_url = f"https://sih-26023-flame.vercel.app{js_file}" if js_file.startswith("/") else js_file
                try:
                    with urllib.request.urlopen(urllib.request.Request(js_url, headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"})) as js_resp:
                        js_text = js_resp.read().decode("utf-8")
                        if "loca.lt" in js_text:
                            print(f"[FOUND PROD URL] loca.lt found in {js_file}!")
                            return True
                        if "localhost:8000" in js_text:
                            print(f"[OLD BUILD] Still contains localhost:8000 in {js_file}")
                except Exception as e:
                    pass
    except Exception as e:
        print("Error:", e)
    return False

if __name__ == "__main__":
    print("Checking Vercel deployment bundle...")
    for i in range(12):
        if check_bundle():
            print("Vercel deployment updated successfully!")
            break
        print(f"Waiting 10 seconds for Vercel deployment... ({i+1}/12)")
        time.sleep(10)
