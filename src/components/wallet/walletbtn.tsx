import { useState, useEffect } from 'react';
import Button from "../../components/ui/button/Button";
import { Wallet, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AUTO_REFRESH_INTERVAL = 20000; // 20 seconds

export default function WalletButton() {
  const { user, checkAuth, isLoading } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkAuth();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh wallet balance every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      checkAuth();
    }, AUTO_REFRESH_INTERVAL);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [checkAuth]);

  const walletBalance = user?.wallet ? parseFloat(user.wallet).toFixed(2) : '0.00';

  return (
    <Button
      onClick={handleRefresh}
      size="md"
      variant="outline"
      className="relative flex items-center gap-2 font-medium transition-all hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 dark:hover:text-brand-400"
      disabled={isLoading || isRefreshing}
    >
      <Wallet className="h-4 w-4" />
      <span>
        {isLoading && !user ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600"></span>
            Loading...
          </span>
        ) : (
          `UGx ${walletBalance}`
        )}
      </span>

      {/* Manual refresh icon */}
      {!isLoading && (
        <RefreshCw className={`h-3.5 w-3.5 ml-1 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
      )}
    </Button>
  );
}