import { Crown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface PlanButtonProps {
  onClick?: () => void;
  className?: string;
}

export default function PlanButton({
  onClick,
  className = ""
}: PlanButtonProps) {
  const { user, isLoading } = useAuth();

  const plan = user?.planSub || "N/A";

  const getPlanStyles = (planName: string) => {
    switch (planName) {
      case "Standard":
        return "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400";
      case "Premium":
        return "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400";
      case "Enterprise":
        return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400";
      case "Basic":
      default:
        return "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white";
    }
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-none border px-4 py-2.5 text-base font-normal transition-colors ${getPlanStyles(plan)} ${className}`}
      disabled={isLoading}
    >
      <Crown className="w-4 h-4" />
      <span>
        {isLoading ? 'Loading...' : `Plan: ${plan}`}
      </span>
    </button>
  );
}