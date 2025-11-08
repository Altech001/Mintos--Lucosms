import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/button/Button";
import { PlanInfo } from "../../lib/api/models";
import Skeleton from "../../components/ui/Skeleton";
import Input from "../../components/form/input/InputField";

export default function SettingsPage() {
  const { user, apiClient, checkAuth, logout } = useAuth();
  const [plans, setPlans] = useState<Record<string, PlanInfo>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const response = await apiClient.api.userData.userDataGetAllPlans({});
      setPlans(response.plans);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to fetch plans.");
    }
    setIsLoadingPlans(false);
  }, [apiClient]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleChangePlan = async () => {
    if (!selectedPlan) return;
    setError(null);
    setMessage(null);
    setIsChangingPlan(true);
    try {
      await apiClient.api.userData.userDataChangePlan({ changePlanRequest: { newPlan: selectedPlan } });
      await checkAuth(); // Refresh user data
      setMessage(`Successfully changed to the ${selectedPlan} plan!`);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to change plan.");
    }
    setIsChangingPlan(false);
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    if (deleteConfirmText !== "DELETE") {
      setDeleteError("You must type DELETE to confirm.");
      return;
    }
    setIsDeletingAccount(true);
    try {
      await apiClient.api.users.usersDeleteUserMe();
      // Clear session and redirect user out
      logout();
      // Optionally, you might navigate to login or home if a router is available
    } catch (err) {
      const anError = err as Error;
      setDeleteError(anError.message || "Failed to delete account.");
    }
    setIsDeletingAccount(false);
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">Change Plan</h1>

      {message && <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800">{message}</div>}
      {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">{error}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingPlans ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
              <Skeleton className="w-1/2 h-7" />
              <Skeleton className="w-1/3 h-10 mt-2" />
              <Skeleton className="w-full h-4 mt-4" />
              <div className="mt-6 space-y-2">
                <Skeleton className="w-3/4 h-4" />
                <Skeleton className="w-2/3 h-4" />
                <Skeleton className="w-1/2 h-4" />
              </div>
            </div>
          ))
        ) : (
          Object.values(plans).map((plan) => (
          <div 
            key={plan.planName} 
            className={`p-6 border rounded-lg shadow-md cursor-pointer ${user?.planSub === plan.planName ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
            onClick={() => setSelectedPlan(plan.planName)}
          >
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{plan.planName}</h2>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{plan.smsCost} <span className="text-sm font-normal">UGX/SMS</span></p>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{plan.description}</p>
            <ul className="mt-6 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )))}
      </div>

      {selectedPlan && (
        <div className="mt-8 text-center">
          <p className="mb-4 text-lg">You have selected the <strong>{selectedPlan}</strong> plan.</p>
          <Button onClick={handleChangePlan} size="md" isLoading={isChangingPlan}>Confirm Change to {selectedPlan}</Button>
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-12 border-t border-gray-200 dark:border-white/10 pt-8">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Danger Zone</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Delete your account and all related data. This action cannot be undone.</p>
        <Button variant="danger" onClick={() => { setIsDeleteModalOpen(true); setDeleteConfirmText(""); setDeleteError(null); }}>
          Delete Account
        </Button>
      </div>

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Confirm Account Deletion</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This will permanently delete your account and all associated data. To confirm, please type <span className="font-mono font-semibold">DELETE</span> in the input below.
            </p>
            <div className="mt-4">
              <Input
                placeholder="Type DELETE to confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
              {deleteError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                isLoading={isDeletingAccount}
                disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
