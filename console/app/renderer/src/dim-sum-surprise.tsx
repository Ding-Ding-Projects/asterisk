import { useEffect, useRef, useState } from 'react';
import {
  validateDimSumCachePayloadAsync,
  type DimSumCacheEntry,
  type DimSumCacheReader,
} from '../../../shared/dim-sum';
import './dim-sum-surprise.css';

export interface DimSumStartupContext {
  /** The mount must pass the real shared School-mode state. */
  readonly schoolMode: boolean;
  readonly firstRun: boolean;
  readonly errorActive: boolean;
  readonly updateActive: boolean;
  readonly taskActive: boolean;
  readonly reducedMotion: boolean;
}

export interface DimSumSurpriseProps {
  readonly cacheReader: DimSumCacheReader;
  readonly context: DimSumStartupContext;
  readonly autoDismissMs?: number;
  readonly onDiagnostic?: (diagnostic: DimSumDiagnostic) => void;
  readonly onShown?: (entry: DimSumCacheEntry) => void;
}

export type DimSumDiagnostic =
  | { readonly state: 'suppressed'; readonly reason: 'school-mode' | 'first-run' | 'error' | 'update' | 'mid-task' }
  | { readonly state: 'unavailable'; readonly reason: string };

export interface DimSumRandomSource {
  nextUint32(): number;
}

/** The largest prefix of the uint32 domain whose size is one tenth of its domain. */
export const DIM_SUM_DRAW_THRESHOLD = Math.floor(0x100000000 / 10);

/** A fresh cryptographically secure draw. There is no Math.random fallback. */
export function secureDimSumRandomSource(): DimSumRandomSource | undefined {
  const cryptoSource = globalThis.crypto;
  if (!cryptoSource?.getRandomValues) return undefined;
  return {
    nextUint32(): number {
      const value = new Uint32Array(1);
      cryptoSource.getRandomValues(value);
      return value[0]!;
    },
  };
}

/** Exactly 10% of the uint32 interval, with no second draw or retry. */
export function isDimSumDrawWinning(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < 0x100000000 && value < DIM_SUM_DRAW_THRESHOLD;
}

function suppression(context: DimSumStartupContext): DimSumDiagnostic | undefined {
  if (context.schoolMode) return { state: 'suppressed', reason: 'school-mode' };
  if (context.firstRun) return { state: 'suppressed', reason: 'first-run' };
  if (context.errorActive) return { state: 'suppressed', reason: 'error' };
  if (context.updateActive) return { state: 'suppressed', reason: 'update' };
  if (context.taskActive) return { state: 'suppressed', reason: 'mid-task' };
  return undefined;
}

function chooseEntry(entries: readonly DimSumCacheEntry[], value: number): DimSumCacheEntry | undefined {
  if (entries.length === 0) return undefined;
  return entries[value % entries.length];
}

export function DimSumSurprise({ cacheReader, context, autoDismissMs = 8_000, onDiagnostic, onShown }: DimSumSurpriseProps) {
  const attempted = useRef(false);
  const [entry, setEntry] = useState<DimSumCacheEntry | undefined>();
  const [diagnostic, setDiagnostic] = useState<DimSumDiagnostic>();

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    const blocked = suppression(context);
    if (blocked) {
      onDiagnostic?.(blocked);
      return;
    }

    const random = secureDimSumRandomSource();
    if (!random) {
      const unavailable: DimSumDiagnostic = { state: 'unavailable', reason: 'secure startup randomness is unavailable' };
      setDiagnostic(unavailable);
      onDiagnostic?.(unavailable);
      return;
    }
    const draw = random.nextUint32();
    if (!isDimSumDrawWinning(draw)) return;

    let cancelled = false;
    void cacheReader.read().then(async (raw) => {
      if (cancelled) return;
      if (raw === null) {
        const unavailable: DimSumDiagnostic = { state: 'unavailable', reason: 'no validated private dim-sum cache is available' };
        setDiagnostic(unavailable);
        onDiagnostic?.(unavailable);
        return;
      }
      const result = await validateDimSumCachePayloadAsync(raw);
      if (cancelled) return;
      if (!result.ok) {
        const unavailable: DimSumDiagnostic = { state: 'unavailable', reason: result.reason };
        setDiagnostic(unavailable);
        onDiagnostic?.(unavailable);
        return;
      }
      const selected = chooseEntry(result.cache.entries, draw);
      if (!selected) {
        const unavailable: DimSumDiagnostic = { state: 'unavailable', reason: 'the validated private dim-sum cache contains no usable entry' };
        setDiagnostic(unavailable);
        onDiagnostic?.(unavailable);
        return;
      }
      setEntry(selected);
      onShown?.(selected);
    }).catch((error: unknown) => {
      if (cancelled) return;
      const unavailable: DimSumDiagnostic = { state: 'unavailable', reason: `the private dim-sum cache could not be read: ${error instanceof Error ? error.message : 'unknown read error'}` };
      setDiagnostic(unavailable);
      onDiagnostic?.(unavailable);
    });

    return () => { cancelled = true; };
  }, [autoDismissMs, cacheReader, context, onDiagnostic, onShown]);

  useEffect(() => {
    if (!entry && !diagnostic) return undefined;
    const timer = globalThis.setTimeout(() => { setEntry(undefined); setDiagnostic(undefined); }, autoDismissMs);
    return () => globalThis.clearTimeout(timer);
  }, [autoDismissMs, diagnostic, entry]);

  if (entry) {
    return (
      <aside className={`dim-sum-surprise${context.reducedMotion ? ' dim-sum-surprise--reduced-motion' : ''}`} role="status" aria-live="polite" tabIndex={-1}>
        <div className="dim-sum-surprise__card">
          <img className="dim-sum-surprise__image" src={entry.image.dataUrl} alt={`${entry.names.en} · ${entry.names.zhHant}`} />
          <div className="dim-sum-surprise__copy">
            <span className="dim-sum-surprise__eyebrow">A small dim sum surprise</span>
            <strong>{entry.names.en}</strong>
            <span lang="zh-Hant">{entry.names.zhHant}</span>
          </div>
        </div>
      </aside>
    );
  }
  if (diagnostic) {
    return <aside className="dim-sum-surprise dim-sum-surprise--unavailable" role="status" aria-live="polite" tabIndex={-1}>Dim sum surprise unavailable: {diagnostic.reason}</aside>;
  }
  return null;
}

export const DIM_SUM_SURPRISE_REGISTRATION = {
  id: 'dim-sum-surprise',
  component: DimSumSurprise,
  mount: 'startup-overlay',
  nonBlocking: true,
  focusNeutral: true,
  autoDismisses: true,
  optOut: false,
  cache: 'validated-private-application-data-only',
  draw: 'crypto-random-10-percent-once-per-launch',
} as const;
