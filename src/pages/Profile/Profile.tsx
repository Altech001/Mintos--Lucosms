/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Modal from "../../components/ui/modal/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, CreditCard, Wallet, MessageSquare, Gift, Lock, Edit2, Phone, CheckCircle, Loader2 } from "lucide-react";

interface PromoStatus {
  user_id: string;
  current_sms_cost: string;
  has_special_rate: boolean;
  message: string;
}

export default function ProfilePage() {
  const { user, checkAuth, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [promoStatus, setPromoStatus] = useState<PromoStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isValidatingPhone, setIsValidatingPhone] = useState(false);
  const [phoneIdentityName, setPhoneIdentityName] = useState("");
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email);

      const fetchPromoStatus = async () => {
        try {
          const response =
            await apiClient.api.promoCodes.promoCodesGetMyActivePromo({});
          setPromoStatus(response as PromoStatus);
        } catch (err) {
          console.error("Failed to fetch promo status:", err);
        }
      };

      fetchPromoStatus();
      setPhoneNumber(user.phone || "");
    }
  }, [user]);

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    setIsSaving(true);
    try {
      await apiClient.api.users.usersUpdateUserMe({
        userUpdateMe: { fullName, email },
      });
      await checkAuth();
      setMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to update profile.");
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email);
    }
    setIsEditing(false);
  };

  const handlePasswordChange = async () => {
    setError(null);
    setMessage(null);
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await apiClient.api.users.usersUpdatePasswordMe({
        updatePassword: {
          currentPassword: currentPassword,
          newPassword: newPassword,
        },
      });
      setMessage("Password updated successfully!");
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to update password.");
    }
    setIsChangingPassword(false);
  };

  const validatePhoneNumber = async (msisdn: string): Promise<boolean> => {
    setIsValidatingPhone(true);
    try {
      const formattedNumber = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;

      const response = await fetch('https://lucopay-backend.vercel.app/identity/msisdn', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ msisdn: formattedNumber }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPhoneIdentityName(data.identityname);
        setMessage(`Phone verified: ${data.identityname}`);
        return true;
      } else {
        setError(data.message || 'Could not validate phone number');
        return false;
      }
    } catch {
      setError('Failed to validate phone number. Please try again.');
      return false;
    } finally {
      setIsValidatingPhone(false);
    }
  };

  const handlePhoneUpdate = async () => {
    setError(null);
    setMessage(null);

    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 9) {
      setError('Please enter a valid phone number');
      return;
    }

    // Validate phone number first
    const isValid = await validatePhoneNumber(phoneNumber);
    if (!isValid) return;

    setIsUpdatingPhone(true);
    try {
      await apiClient.api.users.usersUpdateUserPhone({
        userPhoneUpdate: { phone: phoneNumber }
      });
      await checkAuth();
      setMessage('Phone number updated successfully!');
      setIsPhoneModalOpen(false);
      setPhoneIdentityName('');
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || 'Failed to update phone number.');
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-64 h-4" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="w-full h-64" />
            <Skeleton className="w-full h-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-32" />
          </div>
        </div>
      </div>
    );
  }

  const formatWalletBalance = (wallet: any): string => {
    if (typeof wallet === 'number') {
      return wallet.toLocaleString();
    }
    if (typeof wallet === 'string') {
      const num = parseFloat(wallet);
      return isNaN(num) ? wallet : num.toLocaleString();
    }
    return "0";
  };

  return (
    <div className="p-4 sm:p-6">
      <ComponentCard
        title="Profile Settings"
        desc="Manage your account information and preferences"
      >
        {/* Header Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-end gap-3">
            {!isEditing && (
              <>
                <Button
                  onClick={() => setIsPasswordModalOpen(true)}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </Button>
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Alert Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {message}
            </p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {error}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Personal Information
                </h2>
              </div>
              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-5">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                        Full Name
                      </Label>
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                        Email Address
                      </Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        size="sm"
                        className="px-6"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        isLoading={isSaving}
                        size="sm"
                        className="px-6"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Full Name
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-white">
                          {user?.fullName || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Email Address
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-white break-all">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Phone Number
                          </p>
                          <p className="text-base font-medium text-gray-900 dark:text-white">
                            {user?.phone || "Not provided"}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setPhoneNumber(user?.phone || "");
                            setIsPhoneModalOpen(true);
                            setError(null);
                            setMessage(null);
                          }}
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                        >
                          {user?.phone ? "Change" : "Add"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                )}
            </div>
          </div>

          {/* Account Details Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Account Details
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Subscription Plan
                    </p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {user?.planSub}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      SMS Cost
                    </p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      UGx {user?.smsCost}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Wallet Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl overflow-hidden border border-blue-600 dark:border-blue-500">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs font-medium text-blue-100 uppercase tracking-wider">
                  Balance
                </div>
              </div>
              <div>
                <p className="text-sm text-blue-100 mb-1">Wallet Balance</p>
                <p className="text-3xl font-bold text-white">
                  UGx {formatWalletBalance(user?.wallet)}
                </p>
              </div>
            </div>
          </div>

          {/* Promo Status Card */}
          {promoStatus && (
            <div className={`rounded-xl overflow-hidden border ${promoStatus.has_special_rate
              ? "bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 border-green-600 dark:border-green-500"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              }`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${promoStatus.has_special_rate
                    ? "bg-white/20"
                    : "bg-pink-100 dark:bg-pink-900/30"
                    }`}>
                    <Gift className={`w-6 h-6 ${promoStatus.has_special_rate
                      ? "text-white"
                      : "text-pink-600 dark:text-pink-400"
                      }`} />
                  </div>
                  <div className={`text-xs font-medium uppercase tracking-wider ${promoStatus.has_special_rate
                    ? "text-green-100"
                    : "text-gray-500 dark:text-gray-400"
                    }`}>
                    {promoStatus.has_special_rate ? "Active" : "Status"}
                  </div>
                </div>
                <div>
                  <p className={`text-sm mb-1 ${promoStatus.has_special_rate
                    ? "text-green-100"
                    : "text-gray-600 dark:text-gray-400"
                    }`}>
                    Promo Status
                  </p>
                  <p className={`text-base font-semibold ${promoStatus.has_special_rate
                    ? "text-white"
                    : "text-gray-900 dark:text-white"
                    }`}>
                    {promoStatus.message}
                  </p>
                  {promoStatus.has_special_rate && (
                    <p className="text-xs text-green-100 mt-2">
                      Current rate: UGx {promoStatus.current_sms_cost}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
      </ComponentCard >

    {/* Password Modal */ }
    < Modal
  isOpen = { isPasswordModalOpen }
  onClose = {() => setIsPasswordModalOpen(false)
}
title = "Change Password"
  >

  <div className="space-y-5">
    
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
        Current Password
      </Label>
      <Input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Enter current password"
        className="w-full"
      />
    </div>
    <span className="text-xs font-medium text-gray-700 dark:text-gray-500 mb-1.5 block">
        8 charaters minimum, including uppercase, lowercase, number, and special character.
      </span>
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
        New Password
      </Label>
      
      <Input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Enter new password"
        className="w-full"
      />
    </div>
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
        Confirm New Password
      </Label>
      <Input
        type="password"
        value={confirmNewPassword}
        onChange={(e) => setConfirmNewPassword(e.target.value)}
        placeholder="Confirm new password"
        className="w-full"
      />
    </div>
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <Button
        onClick={() => setIsPasswordModalOpen(false)}
        variant="outline"
      >
        Cancel
      </Button>
      <Button
        onClick={handlePasswordChange}
        isLoading={isChangingPassword}
      >
        Update Password
      </Button>
    </div>
  </div>
      </Modal >

  {/* Phone Update Modal */ }
  < Modal
isOpen = { isPhoneModalOpen }
onClose = {() => setIsPhoneModalOpen(false)}
title = { user?.phone? "Change Phone Number": "Add Phone Number" }
  >
  <div className="space-y-5">
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
        Phone Number
      </Label>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={(e) => {
          setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''));
          setPhoneIdentityName('');
        }}
        placeholder="e.g. 256712345678"
        className="w-full"
      />
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        Format: countrycode + number (e.g., 2567xxxxxxx)
      </p>
      {phoneIdentityName && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          Account holder: {phoneIdentityName}
        </p>
      )}
    </div>

    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <Button
        onClick={() => setIsPhoneModalOpen(false)}
        variant="outline"
      >
        Cancel
      </Button>
      <Button
        onClick={handlePhoneUpdate}
        disabled={!phoneNumber || phoneNumber.replace(/\D/g, '').length < 9 || isValidatingPhone || isUpdatingPhone}
        isLoading={isValidatingPhone || isUpdatingPhone}
      >
        {isValidatingPhone ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Validating...
          </>
        ) : (
          'Save Number'
        )}
      </Button>
    </div>
  </div>
      </Modal >
    </div >
  );
}