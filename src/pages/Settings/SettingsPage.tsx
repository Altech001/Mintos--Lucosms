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
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [changePlanError, setChangePlanError] = useState<string | null>(null);
  const [isLowBalanceModalOpen, setIsLowBalanceModalOpen] = useState(false);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState<string>(() => {
    const saved = localStorage.getItem('lowBalanceThreshold');
    return saved || '1000';
  });
  const [lowBalanceError, setLowBalanceError] = useState<string | null>(null);
  const [lowBalanceSuccess, setLowBalanceSuccess] = useState<string | null>(null);

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

  const openChangePlanModal = () => {
    if (!selectedPlan) return;
    setIsChangePlanModalOpen(true);
    setBidAmount("");
    setPhoneNumber("");
    setChangePlanError(null);
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;
    
    // Validate inputs
    if (!bidAmount.trim()) {
      setChangePlanError("Please enter the bid amount.");
      return;
    }
    if (!phoneNumber.trim()) {
      setChangePlanError("Please enter your phone number.");
      return;
    }
    
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      setChangePlanError("Please enter a valid amount.");
      return;
    }
    
    setError(null);
    setMessage(null);
    setChangePlanError(null);
    setIsChangingPlan(true);
    try {
      await apiClient.api.userData.userDataChangePlan({ changePlanRequest: { newPlan: selectedPlan } });
      await checkAuth(); // Refresh user data
      setMessage(`Successfully changed to the ${selectedPlan} plan! Bid: ${amount} UGX for phone: ${phoneNumber}`);
      setIsChangePlanModalOpen(false);
      setBidAmount("");
      setPhoneNumber("");
      setSelectedPlan(null);
    } catch (err) {
      const anError = err as Error;
      setChangePlanError(anError.message || "Failed to change plan.");
    }
    setIsChangingPlan(false);
  };

  const handleSaveLowBalanceThreshold = () => {
    setLowBalanceError(null);
    setLowBalanceSuccess(null);
    
    const threshold = parseFloat(lowBalanceThreshold);
    if (isNaN(threshold) || threshold < 0) {
      setLowBalanceError("Please enter a valid amount.");
      return;
    }
    
    localStorage.setItem('lowBalanceThreshold', lowBalanceThreshold);
    setLowBalanceSuccess(`Low balance alert set to ${threshold.toFixed(0)} UGX`);
    setIsLowBalanceModalOpen(false);
    
    // Trigger a re-render of the header component by dispatching a custom event
    window.dispatchEvent(new Event('lowBalanceThresholdChanged'));
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

  const handleApplyPromoCode = async () => {
    setPromoError(null);
    setPromoSuccess(null);
    if (!promoCode.trim()) {
      setPromoError("Please enter a promo code.");
      return;
    }
    setIsApplyingPromo(true);
    try {
      const response = await apiClient.api.promoCodes.promoCodesApplyPromoCode({
        applyPromoCodeRequest: { code: promoCode.trim() }
      });
      setPromoSuccess(response.message || `Promo code applied! New SMS cost: ${response.newSmsCost} UGX (saved ${response.savingsPerSms} UGX per SMS)`);
      setPromoCode("");
      setIsPromoModalOpen(false); // Close modal on success
      await checkAuth(); // Refresh user data to reflect new SMS cost
    } catch (err) {
      // Handle specific error messages from the API
      if (typeof err === 'object' && err !== null) {
        const errorObj = err as { response?: { status?: number; json?: () => Promise<{ detail?: string }> }; message?: string };
        if (errorObj.response?.status === 400 && errorObj.response.json) {
          const errorData = await errorObj.response.json().catch(() => ({ detail: undefined }));
          setPromoError(errorData.detail || "Invalid or expired promo code.");
        } else {
          setPromoError(errorObj.message || "Failed to apply promo code.");
        }
      } else {
        setPromoError("Failed to apply promo code.");
      }
    } finally {
      setIsApplyingPromo(false);
    }
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
          <p className="mb-4 text-lg text-gray-800 dark:text-white">You have selected the <strong>{selectedPlan}</strong> plan.</p>
          <Button onClick={openChangePlanModal} size="md">Continue to Payment</Button>
        </div>
      )}

      {/* Promo Code Section */}
      <div className="mt-12 border-t border-gray-200 dark:border-white/10 pt-8">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Promo Code</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Have a promo code? Apply it to get special SMS pricing and save on your messages.</p>
        {promoSuccess && (
          <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800">
            {promoSuccess}
          </div>
        )}
        <Button variant="outline" onClick={() => { setIsPromoModalOpen(true); setPromoCode(""); setPromoError(null); setPromoSuccess(null); }}>
          Apply Promo Code
        </Button>
      </div>

      {/* Low Balance Alert Section */}
      <div className="mt-12 border-t border-gray-200 dark:border-white/10 pt-8">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Low Balance Alert</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Set a threshold amount to receive alerts when your wallet balance is low. You'll see a warning in the header when your balance drops below this amount.
        </p>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current threshold:</span>
            <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{parseFloat(lowBalanceThreshold).toFixed(0)} UGX</span>
          </div>
        </div>
        {lowBalanceSuccess && (
          <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800">
            {lowBalanceSuccess}
          </div>
        )}
        <Button variant="outline" onClick={() => { setIsLowBalanceModalOpen(true); setLowBalanceError(null); setLowBalanceSuccess(null); }}>
          Configure Alert Threshold
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 border-t border-gray-200 dark:border-white/10 pt-8">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Danger Zone</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Delete your account and all related data. This action cannot be undone.</p>
        <Button variant="danger" onClick={() => { setIsDeleteModalOpen(true); setDeleteConfirmText(""); setDeleteError(null); }}>
          Delete Account
        </Button>
      </div>

      {/* Change Plan Modal */}
      {isChangePlanModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Change to {selectedPlan} Plan</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Enter the bid amount and your phone number to proceed with the plan change.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bid Amount (UGX)
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 1000 (1 = 28 UGX per SMS)"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Example: 1000 UGX = 28 UGX per SMS
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              {changePlanError && (
                <p className="text-sm text-red-600 dark:text-red-400">{changePlanError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsChangePlanModalOpen(false)}>Cancel</Button>
              <Button
                onClick={handleChangePlan}
                isLoading={isChangingPlan}
                disabled={!bidAmount.trim() || !phoneNumber.trim() || isChangingPlan}
              >
                Confirm Change
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Low Balance Threshold Modal */}
      {isLowBalanceModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Set Low Balance Alert Threshold</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Enter the minimum wallet balance amount. You'll be alerted when your balance falls below this threshold.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Threshold Amount (UGX)
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 1000"
                  value={lowBalanceThreshold}
                  onChange={(e) => setLowBalanceThreshold(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Default is 1000 UGX. Set to 0 to disable alerts.
                </p>
              </div>
              {lowBalanceError && (
                <p className="text-sm text-red-600 dark:text-red-400">{lowBalanceError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsLowBalanceModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveLowBalanceThreshold}>Save Threshold</Button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Code Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Apply Promo Code</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Enter your promo code below to get special SMS pricing. The new rate will be applied to your account immediately.
            </p>
            <div className="mt-4">
              <Input
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              {promoError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{promoError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsPromoModalOpen(false)}>Cancel</Button>
              <Button
                onClick={handleApplyPromoCode}
                isLoading={isApplyingPromo}
                disabled={!promoCode.trim() || isApplyingPromo}
              >
                Apply Code
              </Button>
            </div>
          </div>
        </div>
      )}

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
