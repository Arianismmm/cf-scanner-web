import subprocess
import json
import time
import random
import re
from urllib.parse import urlparse, parse_qs, unquote

# Cloudflare IP Ranges (subset for massive scanning)
CF_RANGES = [
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
    "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
    "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
    "172.64.0.0/13", "131.0.72.0/22"
]

def generate_random_ip(cidr):
    base, mask = cidr.split('/')
    parts = base.split('.')
    if mask == "20":
        parts[2] = str(random.randint(48, 63))
    elif mask == "22":
        parts[2] = str(random.randint(int(parts[2]), int(parts[2])+3))
    elif mask == "18":
        parts[2] = str(random.randint(64, 127))
    elif mask == "17":
        parts[1] = str(random.randint(41, 41)) # Simplified
    
    parts[3] = str(random.randint(1, 254))
    return ".".join(parts)

def check_l7(ip, sni, path):
    """
    Performs a raw L7 handshake using system curl to bypass Python TLS limits.
    """
    url = f"https://{ip}{path}"
    # Using curl to simulate a WebSocket upgrade
    cmd = [
        "curl", "-v", "-s", "-o", "/dev/null",
        "--connect-timeout", "2",
        "--max-time", "5",
        "-H", f"Host: {sni}",
        "-H", "Upgrade: websocket",
        "-H", "Connection: Upgrade",
        "-H", "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
        "-H", "Sec-WebSocket-Version: 13",
        "--resolve", f"{sni}:443:{ip}",
        url
    ]
    
    start_time = time.time()
    try:
        process = subprocess.run(cmd, capture_output=True, text=True, timeout=6)
        latency = int((time.time() - start_time) * 1000)
        
        # Check if we got a 101 Switching Protocols or at least a Cloudflare response
        stdout_stderr = process.stdout + process.stderr
        if "HTTP/1.1 101" in stdout_stderr or "HTTP/2" in stdout_stderr or "server: cloudflare" in stdout_stderr.lower():
            return True, latency
        return False, -1
    except:
        return False, -1

def main():
    print("\033[1;35m🚀 Cloudflare L7 Scanner & Quality Analyzer\033[0m")
    print("-" * 50)
    
    vless_link = input("Paste your VLESS link: ").strip()
    if not vless_link.startswith("vless://"):
        print("❌ Invalid VLESS link.")
        return

    # Basic parsing
    try:
        parsed = urlparse(vless_link)
        params = parse_qs(parsed.query)
        sni = params.get('sni', [params.get('host', ['neoipi1.zunaroq.xyz'])[0]])[0]
        path = unquote(params.get('path', ['/'])[0])
        original_host = parsed.netloc.split('@')[-1]
    except Exception as e:
        print(f"❌ Error parsing link: {e}")
        return

    print(f"🔍 SNI: {sni}")
    print(f"🔍 Path: {path}")
    print("-" * 50)

    results = []
    print(f"📡 Probing random Cloudflare edges...")
    
    for _ in range(20):
        range_cidr = random.choice(CF_RANGES)
        ip = generate_random_ip(range_cidr)
        success, latency = check_l7(ip, sni, path)
        
        if success:
            category = "🌐 Average"
            if latency < 250:
                category = "🎮 Gaming"
            elif latency < 500:
                category = "📺 Stream"
            
            print(f"✅ {ip:15} | {latency:4}ms | {category}")
            results.append((ip, latency, category))
        else:
            print(f"❌ {ip:15} | Timeout/Blocked")
    
    if not results:
        print("\n😭 No working IPs found. Your ISP might be blocking SNI or TLS handshakes.")
        return

    results.sort(key=lambda x: x[1])
    best_ip, best_lat, _ = results[0]
    
    print("-" * 50)
    print(f"🏆 \033[1;32mBest IP Found: {best_ip} ({best_lat}ms)\033[0m")
    
    new_link = vless_link.replace(original_host, f"{best_ip}:443")
    print("\n📦 \033[1;34mGenerated VLESS Config:\033[0m")
    print(new_link)
    print("-" * 50)

if __name__ == "__main__":
    main()
