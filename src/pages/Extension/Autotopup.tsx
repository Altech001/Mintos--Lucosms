'use client';

import { ArrowRight, BadgeCheck, CheckCircle, Clock, CreditCard, DollarSign, History, Loader2, Shield, TrendingUp, XCircle, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Alert from "../../components/ui/alert/Alert";
import Button from "../../components/ui/button/Button";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from "../../lib/api/client";
import type { AddFundsRequest, WalletResponse } from "../../lib/api";
import { useAuth } from '../../context/AuthContext';

type Tab = 'topup' | 'history';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  reference_number: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  balance_before: number | null;
  balance_after: number | null;
}

interface TransactionsResponse {
  data: Transaction[];
  count: number;
}

export default function AutoTopUp() {
  const { user, apiClient: authApiClient } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('topup');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string } | null>(null);

  const [topUpAmount, setTopUpAmount] = useState('');
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  const queryClient = useQueryClient();

  // Wallet balance query
  const walletQuery = useQuery<WalletResponse>({
    queryKey: ['wallet'],
    queryFn: () => apiClient.api.userData.userDataGetWalletBalance(),
    staleTime: 60_000,
  });
  const balance = Number.parseFloat(walletQuery.data?.walletBalance ?? '0');

  // Add funds mutation (called after OTP verification success)
  const addFundsMutation = useMutation({
    mutationFn: async (payload: AddFundsRequest) =>
      apiClient.api.userData.userDataAddFundsToWallet({ addFundsRequest: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  // Fetch real transactions from API
  const fetchTransactions = async (): Promise<Transaction[]> => {
    const token = authApiClient.getToken();
    if (!token) return [];

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const endpoint = `${baseUrl}/api/v1/transactions/?skip=0&limit=10`;

    const response = await fetch(endpoint, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    const result: TransactionsResponse = await response.json();
    return result.data;
  };

  const { data: transactions = [], isLoading: isTxLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: fetchTransactions,
    staleTime: 60_000,
  });

  const handleInitiateTopUp = () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) return;
    // Require phone number before proceeding
    if (!phoneNumber) {
      setAlert({ variant: 'warning', title: 'Add Phone Number', message: 'Please add your phone number to receive the OTP.' });
      setShowNumberModal(true);
      return;
    }

    setShowTopUpModal(false);
    setShowOTPModal(true);
    setIsProcessing(true);

    setTimeout(() => setIsProcessing(false), 1200);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    setIsProcessing(true);

    setTimeout(async () => {
      const success = Math.random() > 0.25; // 75% success
      if (success) {
        const amount = parseFloat(topUpAmount);
        // Simulate successful payment then persist via API
        await addFundsMutation.mutateAsync({
          amount,
          paymentMethod: 'Card',
          referenceNumber: 'TOPUP-' + Date.now(),
        });
        // Invalidate transactions query to refetch
        await queryClient.invalidateQueries({ queryKey: ['transactions'] });
        setAlert({ variant: 'success', title: 'Top-Up Successful!', message: `UGx ${amount.toFixed(2)} added to your balance.` });
      } else {
        setAlert({ variant: 'error', title: 'Top-Up Failed', message: 'Invalid OTP or payment declined. Please try again.' });
      }
      setIsProcessing(false);
      setShowOTPModal(false);
      setOtp('');
      setTopUpAmount('');
    }, 1800);
  };

  const resetModals = () => {
    setShowTopUpModal(false);
    setShowOTPModal(false);
    setShowNumberModal(false);
    setTopUpAmount('');
    setOtp('');
  };

  const maskNumber = (num: string) => {
    const digits = num.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
  };

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  return (
    <>
      <PageMeta
        title="Auto TopUp"
        description="Add Credits and View Your TopUp with Courtesy of Mintos SMS"
      />
      <PageBreadcrumb pageTitle="Auto TopUp" />

      {/* Alert Feedback */}
      {alert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-999999 animate-slide-down ">
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            showLink={false}
          />
        </div>
      )}

      <div className="space-y-6">

        {/* Balance Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-6 text-white shadow-xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Available Balance</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                UGx {balance.toFixed(2)}
              </p>
              <p className="mt-1 text-xs opacity-80 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Auto Top-Up Enabled
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs opacity-90">
                <Phone className="h-3.5 w-3.5" />
                {phoneNumber ? (
                  <span>OTP will be sent to {maskNumber(phoneNumber)}</span>
                ) : (
                  <span>No phone number added</span>
                )}
              </div>
            </div>
            <div>
                
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowNumberModal(true)} className="bg-white/15 text-white border-white/30 hover:bg-white/25">
                {phoneNumber ? 'Change Number' : 'Add Number'}
              </Button>
              <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm">
                <BadgeCheck className="h-10 w-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['topup', 'history'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'border-b-2 border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab === 'topup' ? (
                <span className="flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Top Up
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'topup' ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
              Quick Top-Up
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setTopUpAmount(amt.toString());
                    setShowTopUpModal(true);
                  }}
                  className="rounded-xl border border-gray-200 bg-gradient-to-t from-gray-50 to-white p-4 text-center font-semibold text-gray-700 transition-all hover:scale-105 hover:border-brand-300 hover:shadow-md dark:border-gray-700 dark:from-white/5 dark:to-white/10 dark:text-gray-200"
                >
                  UGx {amt}
                </button>
              ))}
            </div>

            <div className="m-6 flex justify-center">
              <Button
                onClick={() => setShowTopUpModal(true)}
                // size="lg"
                className="flex items-center gap-3"
              >
                <CreditCard className="h-5 w-5" />
                Custom Amount
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isTxLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-white/5">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-3 text-gray-500 dark:text-gray-400">No transaction history yet.</p>
              </div>
            ) : (
              transactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                    tx.status === 'completed'
                      ? 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10'
                      : tx.status === 'pending'
                      ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900/30 dark:bg-yellow-900/10'
                      : 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10'
                  } animate-slide-up`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${
                      tx.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      tx.status === 'pending' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {tx.status === 'completed' ? <CheckCircle className="h-5 w-5" /> :
                       tx.status === 'pending' ? <Clock className="h-5 w-5" /> :
                       <XCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {tx.transaction_type === 'credit' ? '+' : '-'}{tx.currency} {tx.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tx.payment_method} • {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-500 mt-0.5">
                        {tx.description}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    tx.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Top-Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enter Amount
              </h3>
              <button
                onClick={resetModals}
                className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <Label>Top-Up Amount</Label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="pl-10"
                    min="1"
                    // step="0.01"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetModals} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiateTopUp}
                  disabled={!topUpAmount || parseFloat(topUpAmount) <= 0 || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-brand-100 p-2 dark:bg-brand-900/20">
                <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Enter OTP
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Check your phone for 6-digit code {phoneNumber ? `sent to ${maskNumber(phoneNumber)}` : ''}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <Input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl font-mono tracking-widest"
                // maxLength={6}
              />

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetModals} className="flex-1" disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyOTP}
                  disabled={otp.length !== 6 || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Add'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Change Number Modal */}
      {showNumberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {phoneNumber ? 'Change Phone Number' : 'Add Phone Number'}
              </h3>
              <button
                onClick={() => setShowNumberModal(false)}
                className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="e.g. 256712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''))}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Use your active number. Format: countrycode + number (e.g., 2567xxxxxxx)</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowNumberModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowNumberModal(false)}
                  disabled={!phoneNumber || phoneNumber.replace(/\D/g, '').length < 9}
                  className="flex-1"
                >
                  Save Number
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}