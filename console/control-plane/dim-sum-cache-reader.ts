/**
 * Mount seam for the package-produced or application-data dim-sum cache.
 *
 * The control plane owns the eventual file or packaged-resource reader. It returns
 * the bounded JSON envelope as text and never returns a public catalog response or
 * performs a startup download. The renderer validates the full envelope again.
 */
export interface DimSumCacheReader {
  read(): Promise<string | null>;
}

export const DIM_SUM_CACHE_FILENAME = 'dim-sum-cache.json';

export function createDimSumCacheReader(read: () => Promise<string | null>): DimSumCacheReader {
  return { read };
}

