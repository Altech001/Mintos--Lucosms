'use client';

import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Gift,
  Mail,
  QrCode,
  Smartphone,
  X
} from 'lucide-react';
import { useState } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
interface SenderId {
  id: string;
  name: string;
  priceUgx: number;               // price per SMS in UGX
  isActive: boolean;
}

interface Integration {
  id: string;
  name: 'WhatsApp' | 'Email Service' | 'Payment Service';
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Dummy Data
// ──────────────────────────────────────────────────────────────────────
const senderIds: SenderId[] = [
  { id: '1', name: 'ATUpdates', priceUgx: 32, isActive: true },
  { id: '2', name: 'UG-SMS',   priceUgx: 35, isActive: false },
  { id: '3', name: 'ATTech', priceUgx: 30, isActive: false },
  { id: '4', name: 'FinTechAT', priceUgx: 29, isActive: false },
  { id: '5', name: 'LUCO-SMS', priceUgx: 45, isActive: true },
];

const initialIntegrations: Integration[] = [
  {
    id: '1',
    name: 'WhatsApp',
    icon: <Smartphone className="w-6 h-6 text-green-600" />,
    description: 'Send messages via WhatsApp Business.',
    enabled: true,
  },
  {
    id: '2',
    name: 'Email Service',
    icon: <Mail className="w-6 h-6 text-blue-600" />,
    description: 'Connect your email provider for transactional emails.',
    enabled: false,
  },
  {
    id: '3',
    name: 'Payment Service',
    icon: <CreditCard className="w-6 h-6 text-purple-600" />,
    description: 'Accept payments directly from SMS links.',
    enabled: false,
  },
];

// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [senders, setSenders] = useState<SenderId[]>(senderIds);
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);


  // Modals
  const [priceModal, setPriceModal] = useState<SenderId | null>(null);
  const [connectModal, setConnectModal] = useState<Integration | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const [showAddNumber, setShowAddNumber] = useState(false);

  // ──────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────
  const selectSender = (sender: SenderId) => {
    if (sender.isActive) return;
    setSenders(prev =>
      prev.map(s => ({
        ...s,
        isActive: s.id === sender.id,
      }))
    );
    setPriceModal(sender);
  };

  const toggleIntegration = (id: string) => {
    setIntegrations(prev =>
      prev.map(i => (i.id === id ? { ...i, enabled: !i.enabled } : i))
    );
  };

  const openConnectModal = (integration: Integration) => {
    setConnectModal(integration);
  };

  const closeModals = () => {
    setPriceModal(null);
    setConnectModal(null);
  };

  const handleDeleteAccount = () => {
    if (deleteInput !== 'DELETE') return;
    alert('Account deleted! (real app → API + logout)');
  };

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageMeta title="Settings" description="Manage Sender IDs, Integrations & Account" />
      <PageBreadcrumb pageTitle="Settings" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-8">
          Account & Services
        </h2>

        {/* ────────────────────── Sender IDs ────────────────────── */}
        <section className="mb-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Sender IDs
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Choose the Sender ID that will appear on your SMS. Price per SMS in <strong>UGX</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {senders.map(sender => (
              <div
                key={sender.id}
                onClick={() => selectSender(sender)}
                className={`relative cursor-pointer rounded-xl border p-5 transition-all
                  ${sender.isActive
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20 shadow-sm'
                    : 'border-gray-200 bg-white dark:border-white/10 dark:bg-white/3 hover:shadow-md'
                  }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {sender.name}
                  </h4>
                  {sender.isActive && (
                    <CheckCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sender.priceUgx} UGX
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> / SMS</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ────────────────────── Integrations ────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Integrations
            </h3>
            <Button variant="outline" size="md" startIcon={<Gift className="w-4 h-4" />} onClick={() => setShowAddNumber(true)}>
              Promo Code
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {integrations.map(int => (
              <div
                key={int.id}
                className="relative bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-white/10 p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center justify-center mb-4">
                  {int.icon}
                </div>

                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {int.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2">
                  {int.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleIntegration(int.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        int.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                          int.enabled ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>

                    {/* Details / Connect */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConnectModal(int)}
                      className="text-xs px-3 py-1"
                    >
                      {int.enabled ? 'Details' : 'Connect'}
                    </Button>
                  </div>

                  <span className="text-xs text-gray-500 dark:text-gray-400">● ● ●</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ────────────────────── Add Number Modal ────────────────────── */}
              {showAddNumber && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
                    <div>
                                            
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Promo Code / Voucher Code
                      </label>
                      <Input
                        type="text"
                        placeholder="eg. PROMO2024"
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        onClick={() => {
                          setShowAddNumber(false);
                          
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddNumber(false);
                          
                        }}
                        variant="primary"
                      >                        
                        Done 
                      </Button>
                      
                    </div>
                  </div>
                </div>
              )}

        {/* ────────────────────── Delete Account ────────────────────── */}
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/10">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-lg font-medium">Delete Account</h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            This action is permanent. All data will be erased.
          </p>
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 border-red-300 hover:bg-red-100 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            Delete My Account
          </Button>
        </section>
      </div>

      {/* ────────────────────── Price Increase Modal ────────────────────── */}
      {priceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Price Update
              </h3>
              <Button variant="primary" size="sm" onClick={closeModals}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                From <strong>32 UGX</strong> to <strong>{priceModal.priceUgx} UGX</strong> per SMS
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Effective immediately
              </p>
            </div>

            <Button variant="primary" size="md" onClick={closeModals} className="w-full">
              Got it
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────── Integration Connect Modal ────────────────────── */}
      {connectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Connect {connectModal.name}
              </h3>
              <Button variant="outline" size="sm" onClick={closeModals} className='rounded-full'>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* WhatsApp QR Code */}
            {connectModal.name === 'WhatsApp' && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-48 h-48 bg-gray-100 dark:bg-white/10 rounded-xl mb-4">
                  <QrCode className="w-32 h-32 text-gray-600 dark:text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Scan this QR code with your WhatsApp app to connect.
                </p>
                <Button variant="primary" size="md" className="w-full">
                  Connected
                </Button>
              </div>
            )}

            {/* Email / Payment – simple connect */}
            {(connectModal.name === 'Email Service' || connectModal.name === 'Payment Service') && (
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  Click below to authorize {connectModal.name}.
                </p>
                <Button variant="primary" size="md" className="w-full">
                  Connect {connectModal.name}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────── Delete Account Confirm ────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Account Deletion
              </h3>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput('');
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Type <strong>DELETE</strong> to confirm.
            </p>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE'}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}