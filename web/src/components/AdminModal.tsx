import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { haptics } from '../lib/telegram';
import { getGigaPubProjectId, setGigaPubProjectId } from '../lib/gigapub';
import { ShieldAlert, Users, Radio, Wrench, X, Send, CheckCircle2, AlertTriangle, RefreshCw, Gift, Check } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalWatchedAddresses: number;
  totalTransactions: number;
  maintenanceMode: {
    enabled: boolean;
    message: string;
  };
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('Sistem sedang dalam pemeliharaan berkala.');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [adminGigaId, setAdminGigaId] = useState(getGigaPubProjectId());
  const [adminGigaSaved, setAdminGigaSaved] = useState(false);

  const handleSaveGigaId = () => {
    setGigaPubProjectId(adminGigaId);
    haptics.notification('success');
    setAdminGigaSaved(true);
    setTimeout(() => setAdminGigaSaved(false), 2000);
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AdminStats>('/api/admin/stats');
      setStats(data);
      setMaintenanceEnabled(data.maintenanceMode?.enabled ?? false);
      if (data.maintenanceMode?.message) {
        setMaintenanceMsg(data.maintenanceMode.message);
      }
    } catch (err: any) {
      console.warn('[Admin Stats Load] Preview mode fallback:', err);
      // Fallback for standalone preview
      setStats({
        totalUsers: 48,
        totalWatchedAddresses: 92,
        totalTransactions: 314,
        maintenanceMode: { enabled: false, message: 'Pemeliharaan sistem.' },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleMaintenance = async () => {
    const nextState = !maintenanceEnabled;
    setMaintenanceEnabled(nextState);
    haptics.impact('medium');

    try {
      await apiFetch('/api/admin/maintenance', {
        method: 'POST',
        body: JSON.stringify({ enabled: nextState, message: maintenanceMsg }),
      });
      haptics.notification('success');
    } catch (err) {
      console.error('[Admin Maintenance Toggle Error]:', err);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) return;

    const doBroadcast = async () => {
      setBroadcasting(true);
      setBroadcastStatus(null);
      haptics.impact('heavy');

      try {
        const res = await apiFetch<any>('/api/admin/broadcast', {
          method: 'POST',
          body: JSON.stringify({ message: broadcastText }),
        });

        setBroadcastStatus(`Sukses: Terkirim ke ${res.sentCount || 0} pengguna.`);
        haptics.notification('success');
        setBroadcastText('');
      } catch (err: any) {
        setBroadcastStatus(`Error: ${err.message || 'Gagal mengirim broadcast'}`);
        haptics.notification('error');
      } finally {
        setBroadcasting(false);
      }
    };

    const msg = `Kirim broadcast ini ke semua (${stats?.totalUsers || 0}) pengguna aktif bot?`;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.showConfirm) {
      tg.showConfirm(msg, (ok: boolean) => {
        if (ok) doBroadcast();
      });
    } else if (confirm(msg)) {
      doBroadcast();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          haptics.impact('light');
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-japandi-fade"
    >
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-t-bento sm:rounded-bento w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-japandi-slide-up sm:animate-japandi-fade-up">
        {/* Bottom Sheet Grabber Handle */}
        <div className="w-10 h-1 bg-brand-border dark:bg-brand-border-dark rounded-full mx-auto mt-2.5 mb-0.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="p-4 border-b border-brand-divider dark:border-brand-divider-dark flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-chain-evm/15 flex items-center justify-center text-chain-evm">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">Admin Control Center</h2>
              <p className="text-[11px] font-mono text-brand-subdued">Sistem & Operasional Bot</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadStats}
              disabled={loading}
              className="w-9 h-9 rounded-full flex items-center justify-center text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark hover:bg-surface-dim active:scale-90 transition-all"
              aria-label="Perbarui statistik admin"
              title="Perbarui data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                haptics.impact('light');
                onClose();
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark hover:bg-surface-dim active:scale-90 transition-all"
              aria-label="Tutup panel admin"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4 text-xs">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-tile text-center">
              <Users className="w-4 h-4 text-chain-ton mx-auto mb-1" />
              <div className="font-mono text-base font-semibold">{stats?.totalUsers ?? '—'}</div>
              <div className="text-[10px] text-brand-subdued uppercase">Users</div>
            </div>

            <div className="p-3 bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-tile text-center">
              <Radio className="w-4 h-4 text-chain-evm mx-auto mb-1" />
              <div className="font-mono text-base font-semibold">{stats?.totalWatchedAddresses ?? '—'}</div>
              <div className="text-[10px] text-brand-subdued uppercase">Wallets</div>
            </div>

            <div className="p-3 bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-tile text-center">
              <Wrench className="w-4 h-4 text-chain-solana mx-auto mb-1" />
              <div className="font-mono text-base font-semibold">{stats?.totalTransactions ?? '—'}</div>
              <div className="text-[10px] text-brand-subdued uppercase">Mutasi</div>
            </div>
          </div>

          {/* Maintenance Mode Killswitch */}
          <div className="p-3.5 bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-tile flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-chain-evm" />
                  Mode Pemeliharaan (Kill-switch)
                </div>
                <div className="text-[11px] text-brand-subdued">
                  Tampilkan banner pemeliharaan di Mini App
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceEnabled}
                  onChange={handleToggleMaintenance}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-dim dark:bg-surface-container-high-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-chain-evm"></div>
              </label>
            </div>

            {maintenanceEnabled && (
              <input
                type="text"
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                placeholder="Pesan pemeliharaan untuk pengguna..."
                className="w-full mt-1 px-3 py-1.5 text-xs bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-button focus:outline-none"
              />
            )}
          </div>

          {/* Broadcast Announcement Center */}
          <div className="p-3.5 bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-tile flex flex-col gap-2.5">
            <div className="font-semibold text-xs flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-chain-ton" />
              Kirim Broadcast Pengumuman Bot
            </div>
            <p className="text-[11px] text-brand-subdued leading-relaxed">
              Pesan ini akan dikirim via Telegram Bot ke seluruh {stats?.totalUsers || 0} pengguna aktif dengan batas aman 20 pesan/detik.
            </p>

            <textarea
              rows={3}
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Tulis pengumuman resmi di sini (format HTML didukung)..."
              style={{ fontSize: '16px' }}
              className="w-full p-2.5 bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-button focus:outline-none font-sans text-xs"
            />

            {broadcastStatus && (
              <div className="text-[11px] font-mono text-semantic-gain flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {broadcastStatus}
              </div>
            )}

            <button
              onClick={handleSendBroadcast}
              disabled={broadcasting || !broadcastText.trim()}
              className="py-2 px-3 bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button font-medium text-xs flex items-center justify-center gap-1.5 hover:opacity-90 active:opacity-80 disabled:opacity-50 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
              {broadcasting ? 'Mengirim Broadcast...' : 'Kirim Pengumuman'}
            </button>
          </div>

          {/* GigaPub Monetization Project ID Control */}
          <div className="p-3.5 bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-tile flex flex-col gap-2.5">
            <div className="font-semibold text-xs flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-amber-500" />
                GigaPub Ad & OfferWall Project ID
              </div>
              <span className="font-mono text-[10px] text-brand-subdued">
                Aktif: {getGigaPubProjectId()}
              </span>
            </div>
            <p className="text-[11px] text-brand-subdued leading-relaxed">
              Gunakan ID numerik akun GigaPub Anda dari partner.giga.pub / @gigapub_bot (contoh bawaan: 8036).
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={adminGigaId}
                onChange={(e) => setAdminGigaId(e.target.value)}
                placeholder="Contoh: 8036"
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-button focus:outline-none"
              />
              <button
                onClick={handleSaveGigaId}
                className="py-1.5 px-3 bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button font-semibold text-xs flex items-center gap-1 shadow-xs"
              >
                {adminGigaSaved ? (
                  <>
                    <Check className="w-3 h-3 text-semantic-gain" />
                    Tersimpan
                  </>
                ) : (
                  'Simpan ID'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

