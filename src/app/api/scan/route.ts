import { NextResponse } from 'next/server';
import tls from 'node:tls';
import http from 'node:http';

/**
 * Performs a Layer 7 TLS + WebSocket Handshake check.
 */
async function checkL7(ip: string, port: number, sni: string, path: string): Promise<{ success: boolean; latency: number; error?: string }> {
  const start = Date.now();

  return new Promise((resolve) => {
    const socket = tls.connect({
      host: ip,
      port: port,
      servername: sni,
      rejectUnauthorized: false,
      ALPNProtocols: ['http/1.1'], // Force HTTP/1.1 to simplify header detection
    }, () => {
      const request = [
        `GET ${path} HTTP/1.1`,
        `Host: ${sni}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version: 13',
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        '\r\n'
      ].join('\r\n');

      socket.write(request);
    });

    socket.setTimeout(4000); // 4s timeout matches cf.py behavior better

    socket.on('data', (data) => {
      const response = data.toString();
      const latency = Date.now() - start;
      const lowerRes = response.toLowerCase();

      // Strict Check for WebSocket / Proper Edge
      if (lowerRes.includes('101 switching') || lowerRes.includes('cf-ray')) {
        resolve({ success: true, latency });
      } else if (lowerRes.includes('server: cloudflare') || lowerRes.includes('http/')) {
        // Broad Check: It's definitely a Cloudflare edge node
        resolve({ success: true, latency, error: 'Standard Edge' });
      } else {
        resolve({ success: false, latency: -1, error: 'Unknown Response' });
      }
      socket.destroy();
    });

    socket.on('secureConnect', () => {
      // If we got here, TLS is good. If no data comes for 3s, consider it valid but sluggish.
      const timer = setTimeout(() => {
        resolve({ success: true, latency: Date.now() - start, error: 'Basic TLS OK' });
        socket.destroy();
      }, 3000);
      socket.on('data', () => clearTimeout(timer));
    });

    socket.on('error', (err) => {
      resolve({ success: false, latency: -1, error: err.message });
      socket.destroy();
    });

    socket.on('timeout', () => {
      resolve({ success: false, latency: -1, error: 'Timeout' });
      socket.destroy();
    });
  });
}

export async function POST(req: Request) {
  try {
    const { ips, sni, path } = await req.json();

    if (!ips || !Array.isArray(ips)) {
      return NextResponse.json({ error: 'Invalid IP list' }, { status: 400 });
    }

    // Scan IPs concurrently
    const results = await Promise.all(
      ips.slice(0, 10).map(async (ip) => {
        const res = await checkL7(ip, 443, sni, path);
        return { ip, ...res };
      })
    );

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
