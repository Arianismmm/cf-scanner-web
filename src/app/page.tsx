"use client";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Zap,
  Globe,
  Copy,
  Check,
  Activity,
  Search,
  Loader2,
  AlertTriangle,
  Flame,
  Gamepad2,
  Tv,
  ChevronRight,
  Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanResult {
  ip: string;
  success: boolean;
  latency: number;
  error?: string;
}

const CF_RANGES = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
  "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
  "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "172.64.0.0/13", "131.0.72.0/22"
];

export default function Home() {
  const [vlessLink, setVlessLink] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [currentStep, setCurrentStep] = useState('');
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const success = results.filter(r => r.success);
    const avgLat = success.length > 0 ? Math.round(success.reduce((acc, r) => acc + r.latency, 0) / success.length) : 0;
    return { success: success.length, avgLat };
  }, [results]);

  const parseVless = (link: string) => {
    try {
      const url = new URL(link);
      const params = new URLSearchParams(url.search);
      return {
        sni: params.get('sni') || params.get('host') || 'neoipi1.zunaroq.xyz',
        path: decodeURIComponent(params.get('path') || '/')
      };
    } catch {
      return { sni: 'neoipi1.zunaroq.xyz', path: '/ip1neo@sf' };
    }
  };

  const startScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setResults([]);

    const config = parseVless(vlessLink);

    // Pick 30 random IPs to test
    const allIps: string[] = [];
    setCurrentStep('Generating target nodes...');

    // Lightweight IP generation
    for (let i = 0; i < 30; i++) {
      const range = CF_RANGES[Math.floor(Math.random() * CF_RANGES.length)];
      const [base] = range.split('/');
      const parts = base.split('.');
      parts[2] = Math.floor(Math.random() * 255).toString();
      parts[3] = Math.floor(Math.random() * 255).toString();
      allIps.push(parts.join('.'));
    }

    setCurrentStep('Initializing L7 handshakes...');

    // Batch scan (5 at a time)
    for (let i = 0; i < allIps.length; i += 5) {
      const batch = allIps.slice(i, i + 5);
      setCurrentStep(`Probing batch ${Math.floor(i / 5) + 1}...`);

      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          body: JSON.stringify({ ips: batch, ...config }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.results) {
          setResults(prev => [...prev, ...data.results]);
        }
      } catch (e) {
        console.error(e);
      }
    }

    setIsScanning(false);
    setCurrentStep('Deep analysis complete.');
  };

  const copyConfig = (ip: string) => {
    if (!vlessLink) return;
    try {
      const url = new URL(vlessLink);
      const host = url.host.split('@').pop();
      const newLink = vlessLink.replace(host || '', `${ip}:443`);
      navigator.clipboard.writeText(newLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      navigator.clipboard.writeText(ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 selection:bg-violet-500/30 overflow-x-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-24">
        {/* Header */}
        <header className="flex flex-col items-center text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-6"
          >
            <Activity className="w-4 h-4" />
            <span>Cloudflare Edge Discovery Node</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6"
          >
            L7 <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">Analyzer</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-2xl text-lg"
          >
            Deep packet inspection and WebSocket handshake auditor. Locate ultra-low latency Cloudflare nodes for your VLESS configurations in seconds.
          </motion.p>
        </header>

        {/* Console Box */}
        <section className="grid lg:grid-cols-[1fr,350px] gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">VLESS Configuration</h2>
                    <p className="text-sm text-slate-500">Paste your link to start node auditing</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <textarea
                    value={vlessLink}
                    onChange={(e) => setVlessLink(e.target.value)}
                    placeholder="vless://your-uuid@your-sni:443?encryption=none&type=ws..."
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none"
                  />
                </div>

                <button
                  onClick={startScan}
                  disabled={!vlessLink || isScanning}
                  className={cn(
                    "w-full h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 group overflow-hidden relative",
                    isScanning
                      ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                      : vlessLink
                        ? "bg-white text-slate-900 hover:bg-violet-50"
                        : "bg-slate-800/50 text-slate-500 cursor-not-allowed"
                  )}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{currentStep}</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-5 h-5 group-hover:text-orange-500 transition-colors" />
                      <span>Execute Deep Scan</span>
                    </>
                  )}
                  {isScanning && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-1 bg-violet-500"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 15, ease: "linear" }}
                    />
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Stats & Tips */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl"
            >
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Metrics Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div className="text-slate-500 text-xs mb-1">Success</div>
                  <div className="text-2xl font-bold text-white">{stats.success}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div className="text-slate-500 text-xs mb-1">Avg Latency</div>
                  <div className="text-2xl font-bold text-white">{stats.avgLat}<span className="text-sm font-normal text-slate-500 ml-1">ms</span></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-violet-500/5 border border-violet-500/10 p-6 rounded-2xl"
            >
              <div className="flex items-start gap-4">
                <div className="text-violet-400 mt-1"><Zap className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-white font-medium mb-1 text-sm">Pro Tip</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Nodes below 250ms with 0% loss are ideal for **Gaming**. Use the copy button to update your config instantly.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Results Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Globe className="w-6 h-6 text-blue-400" />
              Validated Nodes
            </h2>
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-500">
              Live Data
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode='popLayout'>
              {results.map((res, idx) => (
                <motion.div
                  key={res.ip}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className={cn(
                    "relative group bg-slate-900 border transition-all hover:shadow-[0_0_30px_-10px_rgba(139,92,246,0.3)]",
                    res.success ? "border-slate-800 hover:border-violet-500/50" : "border-red-900/30 opacity-60"
                  )}
                  style={{ borderRadius: '1.25rem' }}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-slate-300 font-medium">{res.ip}</span>
                      <button
                        onClick={() => copyConfig(res.ip)}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-90"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 capitalize">
                          <span>Quality</span>
                          <span className={cn(
                            "font-semibold",
                            res.latency < 250 ? "text-green-500" : res.latency < 500 ? "text-blue-500" : "text-yellow-500"
                          )}>
                            {res.latency < 250 ? "Gaming 🎮" : res.latency < 500 ? "Streaming 📺" : "Average 🌐"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(10, 100 - (res.latency / 10))}%` }}
                            className={cn(
                              "h-full rounded-full",
                              res.latency < 250 ? "bg-green-500" : res.latency < 500 ? "bg-blue-500" : "bg-yellow-500"
                            )}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-0.5">Latency</div>
                        <div className="text-lg font-bold text-white">{res.latency}ms</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {results.length === 0 && !isScanning && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl text-slate-600">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg">No nodes verified yet. Enter a VLESS link and start auditing.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-900 text-center">
        <p className="text-slate-600 text-sm flex items-center justify-center gap-2">
          Built for performance. Privacy focused. <Shield className="w-3 h-3" /> 2024 Node Analyzer.
        </p>
      </footer>
    </main>
  );
}
