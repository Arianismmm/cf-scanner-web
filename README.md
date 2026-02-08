# 🚀 Cloudflare L7 Scanner & Quality Analyzer

A professional, high-fidelity Layer 7 scanner for Cloudflare nodes. Designed specifically to identify "clean" IP addresses that support WebSocket upgrades in high-censorship environments.

## ✨ Features

*   **L7 Handshake Verification**: Uses system-native `curl` to bypass Python's TLS fingerprinting and accurately simulate browser behavior.
*   **Quality Analysis**: Automatically classifies IPs into **Gaming** (Low Jitter), **Stream** (High Bandwidth/Stable), and **Average** categories.
*   **VLESS Integration**: Paste your VLESS link, and the tool will automatically find the best IP and generate a working configuration for you.
*   **Massive Scan Mode**: Randomly scans thousands of official Cloudflare IPs to find the fastest entry point for your network.

## 🛠️ Requirements

*   **Python 3.8+**
*   **System `curl`**: Ensure `curl` is installed and available in your PATH (Standard on macOS/Linux).

## 🚀 Quick Start

1.  **Clone the tool**:
    ```bash
    git clone https://github.com/your-username/cf-l7-scanner.git
    cd cf-l7-scanner
    ```
2.  **Run the scanner**:
    ```bash
    python3 cf.py
    ```
3.  **Follow the prompts**: Paste your VLESS link and choose a scanning mode.

## ⚖️ License

MIT License - feel free to use, modify, and distribute.
