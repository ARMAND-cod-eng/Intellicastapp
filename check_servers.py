"""
Quick server status checker
"""
import requests
import sys

def check_server(name, url):
    try:
        response = requests.get(url, timeout=2)
        if response.status_code == 200:
            print(f"[OK] {name} - Running on {url}")
            return True
        else:
            print(f"[WARN] {name} - Responded with status {response.status_code}")
            return False
    except Exception as e:
        print(f"[ERROR] {name} - Not responding ({url})")
        return False

print("="*70)
print("Server Status Check")
print("="*70 + "\n")

servers = [
    ("Frontend (Vite)", "http://localhost:5175"),
    ("Node.js Backend", "http://localhost:3004/api/narration/health"),
    ("Python Podcast API", "http://localhost:8000/health")
]

results = []
for name, url in servers:
    results.append(check_server(name, url))

print("\n" + "="*70)
if all(results):
    print("[SUCCESS] All servers are running!")
    print("\nYou can now:")
    print("1. Open http://localhost:5175")
    print("2. Upload a document in Multi-Voice Conversation panel")
    print("3. Generate your podcast!")
else:
    print("[WARNING] Some servers are not running")
    print("\nMissing servers need to be started:")
    for i, (name, url) in enumerate(servers):
        if not results[i]:
            print(f"  - {name}")
print("="*70)
