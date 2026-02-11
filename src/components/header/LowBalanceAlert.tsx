import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Button from '../ui/button/Button';

export default function LowBalanceAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Get low balance threshold from localStorage (default 1000)
  const getLowBalanceThreshold = () => {
    const saved = localStorage.getItem('lowBalanceThreshold');
    return saved ? parseFloat(saved) : 1000;
  };

  const threshold = getLowBalanceThreshold();
  const walletBalance = user?.wallet ? parseFloat(user.wallet) : 0;
  const isLowBalance = walletBalance < threshold;

  useEffect(() => {
    if (isLowBalance) {
      setShowAlert(true);
      // Trigger animation
      setTimeout(() => setIsAnimating(true), 100);
    } else {
      setShowAlert(false);
      setIsAnimating(false);
    }
  }, [isLowBalance]);

  const handleClick = () => {
    navigate('/settings');
  };

  if (!showAlert) return null;

  return (
    <Button
      onClick={handleClick}
      className={`flex items-center gap-2 text-xs font-medium text-white bg-red-600 rounded-none hover:bg-red-700 transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''
        }`}
      title="Low balance alert - Click to manage settings"
    >
      <AlertTriangle className="w-4 h-4" />
      <span className="hidden sm:inline">Low Balance</span>
      <span className="font-semibold">{walletBalance.toFixed(0)} UGX</span>
    </Button>
  );
}
