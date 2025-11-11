import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Modal from "../../components/ui/modal/Modal";
import { useModal } from "../../hooks/useModal";
import useCustomToast from "../../hooks/useCustomToast";
import { useAuth } from "../../context/AuthContext";
import { PlanInfo } from "../../lib/api/models";
import Button from "../../components/ui/button/Button";

interface PackageRange {
  min: number;
  max: number | null;
  label: string;
}

const PACKAGE_RANGES: PackageRange[] = [
  { min: 100, max: 500, label: "100 - 500 SMS" },
];

function Subscribptions() {
  const { apiClient } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [plans, setPlans] = useState<{ [key: string]: PlanInfo }>({});
  const [currentPlan, setCurrentPlan] = useState<PlanInfo | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageRange | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customSmsCount, setCustomSmsCount] = useState<string>("");

  useEffect(() => {
    fetchPlansAndCurrentPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlansAndCurrentPlan = async () => {
    try {
      setIsLoading(true);
      const [allPlansResponse, currentPlanResponse] = await Promise.all([
        apiClient.api.userData.userDataGetAllPlans(),
        apiClient.api.userData.userDataGetCurrentPlan(),
      ]);
      setPlans(allPlansResponse.plans);
      setCurrentPlan(currentPlanResponse);
    } catch (error) {
      console.error("Error fetching plans:", error);
      showErrorToast("Failed to load subscription plans");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = (plan: PlanInfo) => {
    if (currentPlan?.planName === plan.planName) {
      showErrorToast("You are already on this plan");
      return;
    }
    setSelectedPlan(plan);
    openModal();
  };

  const handlePackageSelect = (packageRange: PackageRange) => {
    setSelectedPackage(packageRange);
    setIsCustomRange(false);
    setCustomSmsCount("");
  };

  const handleCustomRangeSelect = () => {
    setIsCustomRange(true);
    setSelectedPackage(null);
  };

  const calculateTotalCost = () => {
    if (!selectedPlan) return 0;
    const smsCost = parseFloat(selectedPlan.smsCost);
    
    if (isCustomRange && customSmsCount) {
      const count = parseInt(customSmsCount);
      return isNaN(count) ? 0 : smsCost * count;
    }
    
    if (selectedPackage) {
      const smsCount = selectedPackage.max || selectedPackage.min;
      return smsCost * smsCount;
    }
    
    return 0;
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPlan) {
      showErrorToast("Please select a plan");
      return;
    }

    if (!selectedPackage && !isCustomRange) {
      showErrorToast("Please select a package range");
      return;
    }

    if (isCustomRange && (!customSmsCount || parseInt(customSmsCount) <= 0)) {
      showErrorToast("Please enter a valid SMS count");
      return;
    }

    try {
      setIsChangingPlan(true);
      await apiClient.api.userData.userDataChangePlan({
        changePlanRequest: {
          newPlan: selectedPlan.planName,
        },
      });
      
      showSuccessToast(`Successfully upgraded to ${selectedPlan.planName} plan!`);
      closeModal();
      setSelectedPlan(null);
      setSelectedPackage(null);
      setIsCustomRange(false);
      setCustomSmsCount("");
      await fetchPlansAndCurrentPlan();
    } catch (error) {
      console.error("Error changing plan:", error);
      showErrorToast("Failed to change plan. Please try again.");
    } finally {
      setIsChangingPlan(false);
    }
  };

  const getPlanBadgeColor = (planName: string) => {
    switch (planName) {
      case "Basic":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "Standard":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Premium":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Enterprise":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getPlanButtonColor = (planName: string) => {
    switch (planName) {
      case "Basic":
        return "bg-gray-600 hover:bg-gray-700";
      case "Standard":
        return "bg-blue-600 hover:bg-blue-700";
      case "Premium":
        return "bg-purple-600 hover:bg-purple-700";
      case "Enterprise":
        return "bg-amber-600 hover:bg-amber-700";
      default:
        return "bg-primary hover:bg-primary-dark";
    }
  };

  return (
    <div>
      <PageMeta title="Subscriptions" description={""} />
      <PageBreadcrumb pageTitle="Subscriptions" />

      <ComponentCard title="Subscriptions & Packages" desc="Choose the perfect plan for your SMS needs">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div>
            {/* Current Plan Section */}
            {currentPlan && (
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-blue-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Current Plan
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getPlanBadgeColor(currentPlan.planName)}`}>
                        {currentPlan.planName}
                      </span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentPlan.smsCost} UGX
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">per SMS</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Plans Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-4 pr-4 text-sm font-semibold text-gray-900 dark:text-white">Plan</th>
                    <th className="pb-4 pr-4 text-sm font-semibold text-gray-900 dark:text-white">SMS Cost</th>
                    <th className="pb-4 pr-4 text-sm font-semibold text-gray-900 dark:text-white">Description</th>
                    <th className="pb-4 pr-4 text-sm font-semibold text-gray-900 dark:text-white">Features</th>
                    <th className="pb-4 text-sm font-semibold text-gray-900 dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(plans).map(([key, plan]) => (
                    <tr key={key} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPlanBadgeColor(plan.planName)}`}>
                            {plan.planName}
                          </span>
                          {currentPlan?.planName === plan.planName && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              (Active)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {plan.smsCost} UGX
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                          {plan.description}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <ul className="space-y-1">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleSelectPlan(plan)}
                          disabled={currentPlan?.planName === plan.planName}
                          className={`px-4 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            currentPlan?.planName === plan.planName
                              ? "bg-gray-400 dark:bg-gray-600"
                              : getPlanButtonColor(plan.planName)
                          }`}
                        >
                          {currentPlan?.planName === plan.planName ? "Current" : "Select Plan"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ComponentCard>

      {/* Payment Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} title={`Subscribe to ${selectedPlan?.planName} Plan`}>
        {selectedPlan && (
          <div className="space-y-4">
            {/* Plan Details */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Selected Plan</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPlanBadgeColor(selectedPlan.planName)}`}>
                  {selectedPlan.planName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">SMS Cost</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedPlan.smsCost} UGX per SMS
                </span>
              </div>
            </div>

            {/* Package Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Select SMS Package Range
              </label>
              <div className="grid grid-cols-1 gap-3">
                {PACKAGE_RANGES.map((packageRange, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePackageSelect(packageRange)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedPackage?.label === packageRange.label
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-base text-gray-900 dark:text-white mb-1">
                          {packageRange.label}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Cost: {(parseFloat(selectedPlan.smsCost) * (packageRange.max || packageRange.min)).toLocaleString()} UGX
                        </div>
                      </div>
                      {selectedPackage?.label === packageRange.label && (
                        <svg className="w-6 h-6 text-primary flex-shrink-0 ml-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}

                {/* Custom Range Button */}
                <button
                  onClick={handleCustomRangeSelect}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isCustomRange
                      ? "border-primary bg-primary/10 dark:bg-primary/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-base text-gray-900 dark:text-white mb-1">
                        Custom Range
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Enter your own SMS count
                      </div>
                    </div>
                    {isCustomRange && (
                      <svg className="w-6 h-6 text-primary flex-shrink-0 ml-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Custom Range Input */}
                {isCustomRange && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Enter SMS Count
                    </label>
                    <input
                      type="number"
                      value={customSmsCount}
                      onChange={(e) => setCustomSmsCount(e.target.value)}
                      placeholder="e.g., 2500"
                      min="1"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {customSmsCount && parseInt(customSmsCount) > 0 && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Cost: <span className="font-semibold text-gray-900 dark:text-white">
                          {(parseFloat(selectedPlan.smsCost) * parseInt(customSmsCount)).toLocaleString()} UGX
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Total Cost */}
            {(selectedPackage || (isCustomRange && customSmsCount && parseInt(customSmsCount) > 0)) && (
              <div className="p-4 bg-gradient-to-r from-primary/10 to-purple-100/50 dark:from-primary/20 dark:to-purple-900/30 rounded-lg border border-primary/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Total Cost</span>
                  <span className="text-2xl font-bold text-primary">
                    {calculateTotalCost().toLocaleString()} UGX
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {selectedPackage ? `For ${selectedPackage.label}` : `For ${parseInt(customSmsCount).toLocaleString()} SMS`}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={isChangingPlan}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <Button
                onClick={handleConfirmPurchase}
                disabled={(!selectedPackage && !isCustomRange) || isChangingPlan || (isCustomRange && (!customSmsCount || parseInt(customSmsCount) <= 0))}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isChangingPlan ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  "Confirm & Subscribe"
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Subscribptions;
