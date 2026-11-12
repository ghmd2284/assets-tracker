import React, { useState } from 'react';
import { UserRewardSummary } from '@asset-tracker/shared';
import { Language, translations } from '../lib/i18n';
import { haptics } from '../lib/telegram';
import { showGigaRewardedAd, openOfferWall, hasOfferWallOffers } from '../lib/gigapub';
import {
  X,
  Gift,
  Play,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Award,
} from 'lucide-react';

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: UserRewardSummary;
  onRewardClaimed: (newPoints: number, newSlots: number) => void;
  onTriggerFastSync: () => Promise<void>;
  lang?: Language;
}

export function RewardsModal({
  isOpen,
  onClose,
  summary,
  onRewardClaimed,
  onTriggerFastSync,
  lang = 'id',
}: RewardsModalProps) {
  const t = translations[lang];
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoSuccessNotice, setVideoSuccessNotice] = useState(false);
  const offersAvailable = hasOfferWallOffers();

  if (!isOpen) return null;

  const handleWatchVideo = async () => {
    if (isVideoLoading) return;
    setIsVideoLoading(true);
    haptics.impact('medium');

    try {
      const result = await showGigaRewardedAd();
      if (result.success) {
        haptics.notification('success');
        setVideoSuccessNotice(true);
        const addedPoints = 10;
        const newTotal = summary.rewardPoints + addedPoints;
        const newSlots = Math.max(summary.bonusWalletSlots, Math.floor(newTotal / 500));
        onRewardClaimed(newTotal, newSlots);

        // Trigger on-chain balance fast sync
        await onTriggerFastSync();

        setTimeout(() => {
          setVideoSuccessNotice(false);
        }, 4000);
      }
    } catch (err) {
      console.warn('[RewardsModal] Video ad failed or skipped:', err);
    } finally {
      setIsVideoLoading(false);
    }
  };

  const handleOpenOfferWall = () => {
    haptics.impact('medium');
    openOfferWall();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rewards-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] bg-surface dark:bg-surface-dark border-t sm:border border-brand-border dark:border-brand-border-dark rounded-t-2xl sm:rounded-tile p-5 shadow-xl flex flex-col gap-4 overflow-y-auto animate-japandi-fade-up transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-brand-divider dark:border-brand-divider-dark">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 dark:bg-amber-400/10 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h2 id="rewards-modal-title" className="text-sm font-semibold">
                {t.rewards.title}
              </h2>
              <p className="text-[11px] text-brand-subdued">{t.rewards.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              haptics.selection();
              onClose();
            }}
            className="p-1 rounded-full text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Rewards Stats Bento Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Points */}
          <div className="p-3 rounded-lg bg-surface-dim dark:bg-surface-container-high-dark border border-brand-border dark:border-brand-border-dark flex flex-col items-center text-center">
            <div className="text-[10px] font-medium text-brand-subdued uppercase tracking-wider">
              {t.rewards.points}
            </div>
            <div className="text-lg font-bold font-mono text-brand-primary dark:text-brand-primary-dark mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {summary.rewardPoints}
            </div>
          </div>

          {/* Bonus Slots */}
          <div className="p-3 rounded-lg bg-surface-dim dark:bg-surface-container-high-dark border border-brand-border dark:border-brand-border-dark flex flex-col items-center text-center">
            <div className="text-[10px] font-medium text-brand-subdued uppercase tracking-wider">
              {t.rewards.bonusSlots}
            </div>
            <div className="text-lg font-bold font-mono text-semantic-gain dark:text-semantic-gain-dark mt-0.5 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />+{summary.bonusWalletSlots}
            </div>
          </div>

          {/* Total Capacity */}
          <div className="p-3 rounded-lg bg-surface-dim dark:bg-surface-container-high-dark border border-brand-border dark:border-brand-border-dark flex flex-col items-center text-center">
            <div className="text-[10px] font-medium text-brand-subdued uppercase tracking-wider">
              {t.rewards.maxWallets}
            </div>
            <div className="text-lg font-bold font-mono text-chain-evm mt-0.5">
              {summary.maxWallets}
            </div>
          </div>
        </div>

        {/* Video Ad Success Toast Banner */}
        {videoSuccessNotice && (
          <div className="p-3 rounded-lg bg-semantic-gain-bg border border-semantic-gain/30 text-semantic-gain dark:text-semantic-gain-dark text-xs flex items-center gap-2 animate-toast-enter">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t.rewards.videoSuccessToast}</span>
          </div>
        )}

        {/* Task 1: Rewarded Video Ad */}
        <div className="p-4 rounded-xl border border-brand-border dark:border-brand-border-dark bg-canvas dark:bg-canvas-dark flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-semantic-gain/10 text-semantic-gain flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 fill-current" />
              </div>
              <div>
                <div className="text-xs font-semibold">{t.rewards.watchVideoTitle}</div>
                <div className="text-[11px] text-brand-subdued">{t.rewards.watchVideoDesc}</div>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full bg-semantic-gain/10 text-semantic-gain text-[10px] font-mono font-medium shrink-0">
              +10 Pts
            </span>
          </div>

          <button
            type="button"
            onClick={handleWatchVideo}
            disabled={isVideoLoading}
            className="w-full min-h-[42px] py-2 bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 transition-all shadow-xs"
          >
            {isVideoLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {t.rewards.watchingVideoBtn}
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                {t.rewards.watchVideoBtn}
              </>
            )}
          </button>
        </div>

        {/* Task 2: GigaPub OfferWall */}
        <div className="p-4 rounded-xl border border-brand-border dark:border-brand-border-dark bg-canvas dark:bg-canvas-dark flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-chain-evm/10 text-chain-evm flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">{t.rewards.offerWallTitle}</div>
                <div className="text-[11px] text-brand-subdued">{t.rewards.offerWallDesc}</div>
              </div>
            </div>

            {offersAvailable && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-mono font-medium shrink-0">
                GigaPub
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenOfferWall}
            className="w-full min-h-[42px] py-2 border border-brand-border dark:border-brand-border-dark hover:border-brand-primary/50 text-brand-primary dark:text-brand-primary-dark bg-surface dark:bg-surface-dark rounded-button text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5" />
            {t.rewards.openOfferWallBtn}
          </button>
        </div>

        {/* Rewards Perks & Cryptographic Transparency */}
        <div className="p-3.5 rounded-xl bg-surface-dim dark:bg-surface-container-high-dark border border-brand-border/60 dark:border-brand-border-dark/60 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-primary dark:text-brand-primary-dark">
            <ShieldCheck className="w-3.5 h-3.5 text-chain-ton" />
            <span>{t.rewards.perksTitle}</span>
          </div>

          <ul className="text-[11px] text-brand-subdued flex flex-col gap-1.5 list-disc list-inside">
            <li>{t.rewards.perk1}</li>
            <li>{t.rewards.perk2}</li>
            <li>{t.rewards.perk3}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
