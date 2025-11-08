import { useState, useEffect, useCallback } from 'react';
import { UserPublic, PlanInfo } from '../../../lib/api/models';
import Button from '../../../components/ui/button/Button';
import { useAuth } from '../../../context/AuthContext';

interface PlanModalProps {
  user: UserPublic;
  onClose: () => void;
  onChangePlan: (newPlan: string) => Promise<void>;
  isMutating: boolean;
}

export default function PlanModal({ user, onClose, onChangePlan, isMutating }: PlanModalProps) {
  const { apiClient } = useAuth();
  const [plans, setPlans] = useState<Record<string, PlanInfo>>({});
  const [selectedPlan, setSelectedPlan] = useState<string>(user.planSub || 'Basic');

  const fetchPlans = useCallback(async () => {
    try {
      const response = await apiClient.api.userData.userDataGetAllPlans({});
      setPlans(response.plans);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSave = () => {
    onChangePlan(selectedPlan);
  };

  return (
    <div className="space-y-4">
      <p>Changing plan for <strong>{user.fullName || user.email}</strong>.</p>
      <p>Current Plan: <strong>{user.planSub || 'N/A'}</strong></p>
      <div>
        <label htmlFor="plan-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Plan</label>
        <select
          id="plan-select"
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {Object.keys(plans).map((planName) => (
            <option key={planName} value={planName}>{planName}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <Button onClick={onClose} variant="outline">Cancel</Button>
        <Button onClick={handleSave} isLoading={isMutating}>Change Plan</Button>
      </div>
    </div>
  );
}
