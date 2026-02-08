import { NextResponse } from 'next/server';
import tls from 'node:tls';
import http from 'node:http';

/**
 * Performs a Layer 7 TLS + WebSocket Handshake check.
 */
async function checkL7(ip: string, port: number, sni: string, path: string): Promise<{ success: boolean; latency: number; error?: string }> {
  const start = Date.now();

  return new Promise((resolve) => {
    // We use tls.connect to have full control over the handshake
    const socket = tls.connect({
      host: ip,
      port: port,
      servername: sni, // Crucial for SNI bypass
      rejectUnauthorized: false, // Bypassing for scanner parity
      ALPNProtocols: ['h2', 'http/1.1'],
      timeout: 5000,
    }, () => {
      // Once TLS is established, we send a raw HTTP/1.1 Upgrade request
      const request = [
        `GET ${path} HTTP/1.1`,
        `Host: ${sni}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version: 13',
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        '\r\n'
      ].join('\r\n');

      socket.write(request);
    });

    socket.on('data', (data) => {
      const response = data.toString();
      if (response.includes('101') || response.includes('HTTP/1.1 101')) {
        resolve({ success: true, latency: Date.now() - start });
      } else {
        // Even a 400/403/404 from Cloudflare means L7 is working
        if (response.includes('HTTP/')) {
            resolve({ success: true, latency: Date.now() - start });
        } else {
            resolve({ success: false, latency: -1, error: 'Handshake Rejected' });
        }
      }
      socket.destroy();
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
