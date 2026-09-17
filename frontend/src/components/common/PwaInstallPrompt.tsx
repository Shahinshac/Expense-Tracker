import React, { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle, Share, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Check if iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIos(isAppleDevice);

    // Listen for beforeinstallprompt event (Android / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  if (isInstalled) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold leading-tight">FinStudent Installed</h4>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
            Running in standalone app mode with instant mobile access.
          </p>
        </div>
      </div>
    );
  }

  // If dismissed or compact and cannot install, render accordingly
  if (isDismissed && compact) return null;

  if (compact) {
    // Compact banner (e.g. for sidebar or header)
    return (
      <>
        <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-violet-900/40 to-slate-900/40 border border-indigo-500/20 text-white flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="FinStudent"
              className="w-8 h-8 rounded-lg shadow-sm shrink-0 object-cover"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate">Install App</p>
              <p className="text-[10px] text-slate-400 truncate">Add to Home Screen</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-[11px] flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        </div>

        {/* iOS Step-by-Step Guide Modal */}
        {showIosGuide && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <img src="/pwa-192x192.png" alt="Icon" className="w-6 h-6 rounded-md" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIosGuide(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    In Safari, tap the <span className="font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">Share button <Share className="w-3.5 h-3.5 inline" /></span> at the bottom of the screen.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    Scroll down and tap <span className="font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</span>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    Tap <span className="font-bold text-slate-900 dark:text-white">Add</span> in the top-right corner to place the app icon on your home screen.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIosGuide(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full Card (e.g. for Settings Page)
  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src="/pwa-192x192.png"
            alt="FinStudent Icon"
            className="w-14 h-14 rounded-2xl shadow-md shadow-indigo-500/20 shrink-0 border border-indigo-200/50 dark:border-indigo-800/50 object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                FinStudent Mobile App
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Install FinStudent directly on your phone or desktop home screen with zero app store downloads.
            </p>
          </div>
        </div>

        <button
          onClick={handleInstallClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
        >
          <Smartphone className="w-4 h-4" />
          <span>Add to Home Screen</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Instant launches without address bar</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>High-res custom FinStudent app icon</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Works offline for cached assets</span>
        </div>
      </div>

      {/* iOS Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <img src="/pwa-192x192.png" alt="Icon" className="w-6 h-6 rounded-md" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  In Safari, tap the <span className="font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">Share button <Share className="w-3.5 h-3.5 inline" /></span> at the bottom of the screen.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  Scroll down and tap <span className="font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</span>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  Tap <span className="font-bold text-slate-900 dark:text-white">Add</span> in the top-right corner to place the app icon on your home screen.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
