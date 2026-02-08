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

      // Mirroring cf.py success criteria: 101 Upgrade, HTTP/2 (unlikely here), or server: cloudflare
      if (
        lowerRes.includes('101 switching') ||
        lowerRes.includes('server: cloudflare') ||
        lowerRes.includes('cf-ray') ||
        lowerRes.includes('http/1.1')
      ) {
        resolve({ success: true, latency });
      } else {
        resolve({ success: false, latency: -1, error: 'Handshake Rejected' });
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
