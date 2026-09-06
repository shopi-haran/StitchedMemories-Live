import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchExchangeRate, updateExchangeRateInDb } from '../lib/supabase';
import {
  getExchangeRate,
  setExchangeRateCache,
  subscribeToExchangeRate,
  formatDualPrice,
  formatUsd,
  formatLkr,
} from '../utils/currency';

interface CurrencyContextType {
  rate: number | null;
  isLoading: boolean;
  formatDualPrice: (usdAmount: number | string | undefined | null, overrideRate?: number | null) => string;
  formatUsd: (usdAmount: number) => string;
  formatLkr: (usdAmount: number, overrideRate?: number) => string;
  updateRate: (newRate: number) => Promise<{ success: boolean; error?: any }>;
  refreshRate: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rate, setRateState] = useState<number | null>(getExchangeRate());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync state whenever cached rate changes
  useEffect(() => {
    const unsubscribe = subscribeToExchangeRate((newRate) => {
      setRateState(newRate);
    });
    return unsubscribe;
  }, []);

  // Fetch exchange rate once on mount from app_settings
  const refreshRate = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedRate = await fetchExchangeRate();
      if (fetchedRate !== null && fetchedRate > 0) {
        setRateState(fetchedRate);
        setExchangeRateCache(fetchedRate);
      }
    } catch (err) {
      console.warn('[CurrencyProvider] Failed to fetch exchange rate:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRate();
  }, [refreshRate]);

  // Update rate in database and broadcast locally
  const updateRate = useCallback(async (newRate: number) => {
    try {
      if (newRate <= 0 || isNaN(newRate)) {
        return { success: false, error: new Error('Exchange rate must be greater than zero.') };
      }

      const res = await updateExchangeRateInDb(newRate);
      if (res.success) {
        setRateState(newRate);
        setExchangeRateCache(newRate);
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err) {
      console.error('[CurrencyProvider] updateRate error:', err);
      return { success: false, error: err };
    }
  }, []);

  const formatPriceBound = useCallback(
    (usdAmount: number | string | undefined | null, overrideRate?: number | null) => {
      return formatDualPrice(usdAmount, overrideRate !== undefined ? overrideRate : rate);
    },
    [rate]
  );

  const value: CurrencyContextType = {
    rate,
    isLoading,
    formatDualPrice: formatPriceBound,
    formatUsd,
    formatLkr,
    updateRate,
    refreshRate,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Return graceful fallback so components outside provider don't crash
    return {
      rate: getExchangeRate(),
      isLoading: false,
      formatDualPrice: (usd, override) => formatDualPrice(usd, override),
      formatUsd,
      formatLkr,
      updateRate: async (newRate: number) => {
        setExchangeRateCache(newRate);
        return updateExchangeRateInDb(newRate);
      },
      refreshRate: async () => {},
    };
  }
  return context;
}
