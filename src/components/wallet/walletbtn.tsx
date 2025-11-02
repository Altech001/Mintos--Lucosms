/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import Button from "../../components/ui/button/Button";
import { Wallet, RefreshCw } from 'lucide-react';

// Simulate balance fetch
const fetchBalance = async (): Promise<number> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  // Random balance between $100 and $5000
  return Math.floor(Math.random() * 4900) + 100;
};

export default function WalletButton() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Initial load
  useEffect(() => {
    loadBalance();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setIsAutoRefreshing(true);
        loadBalance().finally(() => {
          setTimeout(() => setIsAutoRefreshing(false), 1000);
        });
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const loadBalance = async () => {
    setIsLoading(true);
    try {
      const newBalance = await fetchBalance();
      setBalance(newBalance);
    } catch (error) {
      console.error("Failed to fetch balance");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    // Force full page reload
    window.location.reload();
  };

  return (
    <Button
      onClick={handleRefresh}
      size="md"
      variant="outline"
      className={`
        relative flex items-center gap-2 font-medium transition-all
        ${isLoading || isAutoRefreshing ? 'pr-10' : ''}
        hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 dark:hover:text-brand-400
      `}
      disabled={isLoading}
    >
      <Wallet className="h-4 w-4" />
      <span>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600"></span>
            Loading...
          </span>
        ) : balance !== null ? (
          `UGx ${balance.toFixed(2)}`
        ) : (
          'Wallet'
        )}
      </span>

      {/* Auto-refresh indicator */}
      {isAutoRefreshing && (
        <div className="absolute -right-1 top-1/2 -translate-y-1/2">
          <div className="h-2 w-2 animate-ping rounded-full bg-green-500"></div>
        </div>
      )}

      {/* Manual refresh icon */}
      {!isLoading && !isAutoRefreshing && (
        <RefreshCw className="h-3.5 w-3.5 ml-1 text-gray-400" />
      )}
    </Button>
  );
}