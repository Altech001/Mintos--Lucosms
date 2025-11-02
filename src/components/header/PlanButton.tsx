import { Crown } from "lucide-react";

interface PlanButtonProps {
  plan?: string;
  onClick?: () => void;
  className?: string;
}

export default function PlanButton({ 
  plan = "Basic", 
  onClick,
  className = "" 
}: PlanButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors ${className}`}
    >
      <Crown className="w-4 h-4" />
      <span>Plan: {plan}</span>
    </button>
  );
}