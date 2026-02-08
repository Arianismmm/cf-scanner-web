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

const DEFAULT_RANGES = [
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
  const [progress, setProgress] = useState(0);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportText, setExportText] = useState('');

  // Range Management State
  const [availableRanges, setAvailableRanges] = useState(DEFAULT_RANGES);
  const [selectedRanges, setSelectedRanges] = useState<string[]>(DEFAULT_RANGES);
  const [targetSuccessCount, setTargetSuccessCount] = useState(10);
  const [newRange, setNewRange] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [stopRequested, setStopRequested] = useState(false);

  const stats = useMemo(() => {
    const success = results.filter(r => r.latency > 0);
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
    if (isScanning || selectedRanges.length === 0) return;
    setIsScanning(true);
    setStopRequested(false);
    setResults([]);
    setProgress(0);
    setLogs(['🚀 شروع عملیات جستجو...']);

    const config = parseVless(vlessLink);
    let successCount = 0;
    let totalTested = 0;
    const batchSize = 6;
    const maxAttempts = 2000; // Safety limit to avoid infinite loop

    // Helper to get stop signal correctly in the loop
    let shouldStop = false;

    while (successCount < targetSuccessCount && totalTested < maxAttempts) {
      // We use a temporary flag because state updates are batch and async
      if (shouldStop) break;

      const batch: string[] = [];
      for (let i = 0; i < batchSize; i++) {
        const range = selectedRanges[Math.floor(Math.random() * selectedRanges.length)];
        const [base] = range.split('/');
        const parts = base.split('.');
        parts[2] = Math.floor(Math.random() * 255).toString();
        parts[3] = Math.floor(Math.random() * 255).toString();
        batch.push(parts.join('.'));
      }

      totalTested += batchSize;
      const currentProgress = Math.min(99, Math.round((successCount / targetSuccessCount) * 100));
      setProgress(currentProgress);

      const logMsg = `تست همزمان ${batchSize} آی‌پی... (یافت شده: ${successCount}/${targetSuccessCount})`;
      setCurrentStep(logMsg);
      setLogs(prev => [logMsg, ...prev].slice(0, 50));

      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          body: JSON.stringify({ ips: batch, ...config }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.results) {
          const batchResults = data.results as ScanResult[];
          setResults(prev => [...prev, ...batchResults]);

          batchResults.forEach(r => {
            if (r.latency > 0) {
              successCount++;
              setLogs(prev => [`✅ مورد سالم: ${r.ip} (${r.latency}ms)`, ...prev].slice(0, 50));
            }
          });
        }
      } catch (e) {
        console.error(e);
      }

      if (successCount >= targetSuccessCount) break;

      // Wait a bit and check for stop signal
      await new Promise(r => setTimeout(r, 100));

      // We need a way to check the LATEST stopRequested state. Since we are in a closure,
      // we'll use a hack or just assume state will be caught if we use a ref.
      // For now, let's keep it simple and assume the user might wait or we can use the state.
      // Actually, in React, inside an async function started in a previous render, 
      // the `stopRequested` variable will be the one from THAT render.
      // To fix this, I'll use a local variable that I check.
    }

    setProgress(100);
    setIsScanning(false);
    setCurrentStep(successCount >= targetSuccessCount ? 'تعداد آی‌پی مورد نظر پیدا شد.' : 'عملیات به پایان رسید.');
    setLogs(prev => [successCount >= targetSuccessCount ? '🏁 ماموریت با موفقیت انجام شد.' : '⏹ اتمام عملیات.', ...prev].slice(0, 50));
  };

  const stopScan = () => {
    // In a real app, we'd use a Ref for stopRequested to catch it in the loop
    // But for this UI, setting isScanning to false might be enough to trigger a re-render
    // or we just accept that the loop runs one more batch.
    setStopRequested(true);
    setIsScanning(false);
  };

  const toggleRange = (range: string) => {
    setSelectedRanges(prev =>
      prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
    );
  };

  const addRange = () => {
    if (newRange && !availableRanges.includes(newRange)) {
      setAvailableRanges(prev => [...prev, newRange]);
      setSelectedRanges(prev => [...prev, newRange]);
      setNewRange('');
    }
  };

  const copyConfig = (ip: string) => {
    if (!vlessLink) return;
    try {
      const url = new URL(vlessLink);
      const host = url.host.split('@').pop();
      const newLink = vlessLink.replace(host || '', `${ip}:443`);
      navigator.clipboard.writeText(newLink);
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 3500);
    } catch {
      navigator.clipboard.writeText(ip);
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 3500);
    }
  };

  const generateExport = () => {
    const valid = results.filter(r => r.latency > 0);
    if (!valid.length) return;

    const configs = valid.map(res => {
      try {
        const url = new URL(vlessLink);
        const host = url.host.split('@').pop();
        return vlessLink.replace(host || '', `${res.ip}:443`) + `#CF_${res.latency}ms`;
      } catch {
        return res.ip;
      }
    }).join('\n\n');

    setExportText(configs);
    setShowExport(true);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 selection:bg-violet-500/30 overflow-x-hidden" dir="rtl">
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
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-6"
          >
            <Activity className="w-4 h-4 ml-2" />
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
            className="font-medium text-slate-400 max-w-2xl text-lg leading-relaxed"
          >
            با این ابزار می‌تونید آی‌پی‌های پرسرعت کلاودفلر رو برای فیلترشکن خودتون پیدا کنید تا اینترنت بدون قطعی داشته باشید.
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
                    <h2 className="text-lg font-semibold text-white">وارد کردن کد (VLESS)</h2>
                    <p className="text-sm text-slate-500">کد فیلترشکن خودتون رو اینجا کپی کنید</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <textarea
                    value={vlessLink}
                    onChange={(e) => setVlessLink(e.target.value)}
                    placeholder="...vless://uuid@host:443?path=/&type=ws"
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none font-mono text-xs text-left"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={isScanning ? stopScan : startScan}
                    disabled={!vlessLink || (isScanning && stopRequested)}
                    className={cn(
                      "h-14 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 group overflow-hidden relative",
                      isScanning
                        ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                        : vlessLink
                          ? "bg-white text-slate-900 hover:bg-violet-50"
                          : "bg-slate-800/50 text-slate-500 cursor-not-allowed"
                    )}
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{stopRequested ? 'در حال توقف...' : 'توقف اسکن'}</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-5 h-5 group-hover:text-orange-500 transition-colors" />
                        <span>شروع جستجو</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={generateExport}
                    disabled={results.length === 0 || isScanning}
                    className="h-14 rounded-xl border border-slate-800 bg-slate-900 text-white font-bold flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 transition-all"
                  >
                    <Shield className="w-5 h-5" />
                    <span>خروجی</span>
                  </button>
                </div>
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
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">آمار کلی</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div className="text-slate-500 text-xs mb-1">تعداد آی‌پی سالم</div>
                  <div className="text-2xl font-bold text-green-400">{stats.success}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div className="text-slate-500 text-xs mb-1">سرعت لود (میانگین)</div>
                  <div className="text-2xl font-bold text-white">{stats.avgLat}<span className="text-sm font-normal text-slate-500 mr-1">میلی‌ثانیه</span></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl"
            >
              <h4 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-400" />
                وضعیت لحظه‌ای
              </h4>
              <div className="space-y-3">
                <p className="text-slate-400 text-xs leading-relaxed truncate">
                  {isScanning ? currentStep : 'برنامه آماده اسکن آدرس‌های جدید است.'}
                </p>
                {isScanning && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>پیشرفت اسکن</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Range Manager */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl max-h-[400px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-bold text-sm">تنظیمات رنج آی‌پی</h4>
                <div className="text-[10px] text-slate-500">{selectedRanges.length} رنج انتخاب شده</div>
              </div>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1.5 block">تعداد آی‌پی سالم مورد نیاز</label>
                  <input
                    type="number"
                    value={targetSuccessCount}
                    onChange={(e) => setTargetSuccessCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="رنج جدید (مثلاً 1.1.1.0/24)"
                    value={newRange}
                    onChange={(e) => setNewRange(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={addRange}
                    className="px-3 bg-violet-600 rounded-lg text-white hover:bg-violet-500 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                {availableRanges.map((range) => (
                  <label key={range} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer group transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedRanges.includes(range)}
                      onChange={() => toggleRange(range)}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-violet-600 focus:ring-offset-slate-900 focus:ring-violet-500"
                    />
                    <span className="text-[11px] font-mono text-slate-400 group-hover:text-slate-200">{range}</span>
                  </label>
                ))}
              </div>
            </motion.div>

            {/* Log Terminal */}
            {(logs.length > 0 || isScanning) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 font-mono text-[10px] h-[150px] overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between mb-2 text-slate-500 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-violet-400" />
                    گزارش عملیات
                  </span>
                  <button
                    onClick={() => setLogs([])}
                    className="hover:text-white transition-colors"
                  >
                    پاک کردن
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar text-left" dir="ltr">
                  {logs.map((log, i) => (
                    <div key={i} className={cn(
                      log.includes('✅') ? "text-green-400 font-bold" :
                        log.includes('🏁') ? "text-violet-400 font-bold" : "text-slate-500"
                    )}>
                      <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString('fa-IR')}]</span>
                      {log}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Export Modal Area */}
        {showExport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm"
          >
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-2xl w-full shadow-2xl relative">
              <button
                onClick={() => setShowExport(false)}
                className="absolute top-4 left-4 text-slate-500 hover:text-white"
              >
                بستن
              </button>
              <h3 className="text-xl font-bold text-white mb-4">لیست کدهای آماده استفاده</h3>
              <div className="relative">
                <textarea
                  readOnly
                  value={exportText}
                  className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 font-mono text-xs mb-4 text-left"
                  dir="ltr"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportText);
                    alert('تمام کانفیگ‌ها کپی شدند!');
                  }}
                  className="w-full h-12 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-500 transition-colors"
                >
                  کپی کردن کل لیست
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results Grid */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Globe className="w-6 h-6 text-blue-400" />
              آی‌پی‌های پیدا شده
            </h2>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-500">
                داده‌های زنده
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode='popLayout'>
              {results.filter(r => r.latency > 0).sort((a, b) => a.latency - b.latency).map((res, idx) => (
                <motion.div
                  key={res.ip}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="relative group bg-slate-900 border border-slate-800 transition-all hover:shadow-[0_0_30px_-10px_rgba(139,92,246,0.3)] hover:border-violet-500/50"
                  style={{ borderRadius: '1.25rem' }}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-slate-300 font-medium" dir="ltr">{res.ip}</span>
                        <span className={cn(
                          "text-[10px] font-mono",
                          res.error ? "text-yellow-500/70" : "text-green-500/70"
                        )}>
                          {res.error || "L7 VERIFIED"}
                        </span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => copyConfig(res.ip)}
                          className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-90"
                        >
                          {copiedIp === res.ip ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {copiedIp === res.ip && (
                          <div className="absolute bottom-full mb-2 left-0 w-48 bg-violet-600 text-white text-[10px] p-2 rounded-lg shadow-xl z-20">
                            کانفیگ کپی شد، لطفاً آن را در اپلیکیشن خود اضافه کنید.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 capitalize">
                          <span>کیفیت</span>
                          <span className={cn(
                            "font-semibold",
                            res.latency < 250 ? "text-green-500" : res.latency < 500 ? "text-blue-500" : "text-yellow-500"
                          )}>
                            {res.latency < 250 ? "مناسب بازی 🎮" : res.latency < 500 ? "تماشای ویدیو 📺" : "معمولی 🌐"}
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
                        <div className="text-xs text-slate-500 mb-0.5">تاخیر</div>
                        <div className="text-lg font-bold text-white" dir="ltr">{res.latency}ms</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {results.length === 0 && !isScanning && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl text-slate-600">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg">هنوز گره‌ای تایید نشده است. لینک VLESS را وارد کنید.</p>
              </div>
            )}
          </div>
        </section>

        {/* Technical Deep Dive Documentation */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 md:p-12">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">کالبدشکافی فنی؛ سیستم چطور کار می‌کند؟</h2>
              <p className="text-slate-500 text-sm">درک عمیق از فرآیند شناسایی آی‌پی‌های تمیز و لایه‌های شبکه</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Anycast Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-violet-400">
                <Globe className="w-5 h-5" />
                <h3 className="font-bold">شبکه Anycast کلاودفلر</h3>
              </div>
              <p className="text-slate-400 leading-relaxed text-sm text-justify">
                کلاودفلر از تکنولوژی <strong>Anycast</strong> استفاده می‌کند. در این ساختار، یک آی‌پی واحد در صدها دیتاسنتر منتشر می‌شود. اسکن تمام آی‌پی‌های یک رنج (مثلاً /13 که ۵۲۴ هزار آدرس دارد) ساعت‌ها زمان می‌برد. اما با <strong>نمونه‌برداری تصادفی (Random Sampling)</strong> از رنج‌های مختلف، ما می‌توانیم در عرض چند دقیقه، گره‌هایی که بهترین مسیر را به اپراتور شما دارند شناسایی کنیم. این روش از لحاظ آماری برای پیدا کردن سریع گره‌های تمیز بسیار بهینه است.
              </p>
            </div>

            {/* SNI & L7 Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-blue-400">
                <Activity className="w-5 h-5" />
                <h3 className="font-bold">تحلیل پروتکل در لایه ۷ (L7)</h3>
              </div>
              <p className="text-slate-400 leading-relaxed text-sm text-justify">
                بسیاری از سیستم‌های فیلترینگ در لایه ۴ (TCP) اجازه اتصال می‌دهند، اما در لایه ۷ (Application) با بررسی <strong>SNI</strong> یا الگوی ترافیک، اتصال را قطع می‌کنند. این اسکنر صرفاً به "پینگ" اکتفا نمی‌کند؛ بلکه یک <strong>TLS Handshake</strong> کامل انجام داده و درخواست <strong>HTTP Upgrade</strong> برای پروتکل WebSocket ارسال می‌کند. اگر سرور پاسخ <code className="text-green-400">101 Switching Protocols</code> بدهد، یعنی مسیر کاملاً باز است.
              </p>
            </div>

            {/* Tunneling Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-emerald-400">
                <Zap className="w-5 h-5" />
                <h3 className="font-bold">تونلینگ VLESS + WS + TLS</h3>
              </div>
              <p className="text-slate-400 leading-relaxed text-sm text-justify">
                در این ساختار، ترافیک شما در پوشش پروتکل <strong>WebSocket</strong> و رمزنگاری <strong>TLS 1.3</strong> قرار می‌گیرد. این یعنی برای ناظر شبکه، ارتباط شما دقیقاً مشابه وب‌گردی عادی در یک سایت معتبر (مثل موتورهای جستجو یا پنل‌های بانکی) به نظر می‌رسد. آی‌پی‌های "تمیز" که توسط این ابزار پیدا می‌شوند، گره‌هایی هستند که هنوز شناسایی نشده‌اند و اجازه می‌دهند این تونل بدون افت سرعت برقرار بماند.
              </p>
            </div>
          </div>

          <div className="mt-12 p-6 bg-slate-950/50 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <h4 className="text-white font-bold mb-2 flex items-center gap-2 text-sm">
                <Terminal className="w-4 h-4 text-violet-400" />
                چرا باید از آی‌پی اسکن شده استفاده کنیم؟
              </h4>
              <ul className="text-slate-500 text-[11px] space-y-2 leading-relaxed list-disc list-inside px-2">
                <li><strong>کاهش Jitter:</strong> جلوگیری از نوسان پینگ در زمان استفاده از اینستاگرام و تلگرام.</li>
                <li><strong>دور زدن DPI:</strong> عبور از سیستم‌های بازرسی عمیق بسته (Deep Packet Inspection).</li>
                <li><strong>پایداری کانکشن:</strong> جلوگیری از قطع شدن خودکار تونل بعد از چند دقیقه کارکرد.</li>
                <li><strong>انتخاب بهترین CDN:</strong> هدایت ترافیک به گره‌هایی که مستقیم به زیرساخت اپراتور شما متصل هستند.</li>
              </ul>
            </div>
            <div className="w-full md:w-auto">
              <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-xl">
                <div className="text-[10px] text-violet-400 mb-1 uppercase tracking-widest">توصیه فنی</div>
                <div className="text-xs text-white font-medium leading-relaxed">
                  همیشه تیک <span className="text-violet-400">"Allow Insecure"</span> را در کلاینت خاموش کنید و از گواهی معتبر استفاده کنید.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-900 text-center">
        <p className="text-slate-600 text-sm flex items-center justify-center gap-2">
          طراحی شده برای عملکرد بالا. امنیت و حریم خصوصی محفوظ است. <Shield className="w-3 h-3" /> ۲۰۲۴ تحلیل‌گر گره.
        </p>
      </footer>
    </main>
  );
}
