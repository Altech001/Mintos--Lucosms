import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { PromoCodePublic, PromoCodeCreate, PromoCodeUpdate } from "../../lib/api/models";
import Button from "../../components/ui/button/Button";
import Modal from "../../components/ui/modal/Modal";
import PromoCodeForm from "./PromoCodeForm";
import Pagination from "../../components/ui/Pagination";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";

interface PromoCodeStats {
  code: string;
  sms_cost: string;
  current_uses: number;
  max_uses: number;
  usage_percentage: number;
  users_with_this_rate: number;
  is_active: boolean;
  is_expired: boolean;
  is_maxed_out: boolean;
  expires_at: string;
  description: string;
  created_at: string;
}

export default function PromoCodeManagementPage() {
  const { apiClient, user } = useAuth();
  const [promoCodes, setPromoCodes] = useState<PromoCodePublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCodePublic | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, inactive
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState<PromoCodePublic | null>(null);
  const [promoCodeStats, setPromoCodeStats] = useState<PromoCodeStats | null>(null);

  const fetchPromoCodes = useCallback(async () => {
    try {
      const response = await apiClient.api.promoCodes.promoCodesGetAllPromoCodes({ limit: 1000 }); // Adjust limit as needed
      setPromoCodes(response.data);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to fetch promo codes.");
    }
  }, [apiClient]);

  useEffect(() => {
    if (user?.isSuperuser) {
      fetchPromoCodes();
    }
  }, [user, fetchPromoCodes]);

  const filteredPromoCodes = promoCodes.filter(pc => {
    const searchMatch = pc.code.toLowerCase().includes(searchTerm.toLowerCase());

    const statusMatch = 
      statusFilter === "all" || 
      (statusFilter === "active" && pc.isActive) || 
      (statusFilter === "inactive" && !pc.isActive);

    return searchMatch && statusMatch;
  });

  const paginatedPromoCodes = filteredPromoCodes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSavePromoCode = async (data: PromoCodeCreate | PromoCodeUpdate) => {
    try {
      if (editingPromoCode) {
        await apiClient.api.promoCodes.promoCodesUpdatePromoCode({ promoId: editingPromoCode.id, promoCodeUpdate: data as PromoCodeUpdate });
      } else {
        await apiClient.api.promoCodes.promoCodesCreatePromoCode({ promoCodeCreate: data as PromoCodeCreate });
      }
      fetchPromoCodes();
      setIsModalOpen(false);
      setEditingPromoCode(null);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to save promo code.");
    }
  };

  const handleShowStats = async (promoCode: PromoCodePublic) => {
    setSelectedPromoCode(promoCode);
    try {
      const stats = await apiClient.api.promoCodes.promoCodesGetPromoCodeStats({ promoId: promoCode.id });
      setPromoCodeStats(stats as PromoCodeStats);
      setStatsModalOpen(true);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to fetch stats.");
    }
  };

  const handleDeletePromoCode = async (promoId: string) => {
    if (window.confirm("Are you sure you want to delete this promo code?")) {
      try {
        await apiClient.api.promoCodes.promoCodesDeletePromoCode({ promoId });
        fetchPromoCodes();
      } catch (err) {
        const anError = err as Error;
        setError(anError.message || "Failed to delete promo code.");
      }
    }
  };

  if (!user?.isSuperuser) {
    return (
      <div className="p-4 text-center text-red-500">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <ComponentCard title="Promo Code Management" desc="Create and manage promo codes">
      <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1></h1>
        <div className="flex flex-wrap items-center gap-4">
          <Input 
            type="text"
            placeholder="Search by code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-auto"
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className=" appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-white/30 dark:focus:border-brand-800 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button size="sm" onClick={() => { setEditingPromoCode(null); setIsModalOpen(true); }}>Add Promo Code</Button>
        </div>
      </div>

      {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">{error}</div>}

      <div className="overflow-x-auto bg-white rounded-lg  dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Code</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">New SMS Cost</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Expires</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedPromoCodes.map((pc) => (
              <tr key={pc.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{pc.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">UGx {pc.smsCost}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {pc.expiresAt ? new Date(pc.expiresAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pc.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {pc.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                  <Button variant="outline" size="sm" className="mr-2" onClick={() => { setEditingPromoCode(pc); setIsModalOpen(true); }}>Edit</Button>
                  <Button variant="outline" size="sm" className="mr-2" onClick={() => handleShowStats(pc)}>Stats</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeletePromoCode(pc.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredPromoCodes.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPromoCode ? "Edit Promo Code" : "Add Promo Code"}>
        <PromoCodeForm 
          promoCode={editingPromoCode}
          onSave={handleSavePromoCode} 
          onCancel={() => {
            setIsModalOpen(false);
            setEditingPromoCode(null);
          }}
        />
      </Modal>

      <Modal isOpen={statsModalOpen} onClose={() => setStatsModalOpen(false)} title={`Stats for ${selectedPromoCode?.code}`}>
        {promoCodeStats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-gray-800  dark:text-gray-300">
              <div>
                <p><strong>Promo Code: </strong> {promoCodeStats.code}</p>
                <p><strong>SMS Cost: </strong>UGx {promoCodeStats.sms_cost}</p>
                <p><strong>Current Uses: </strong> {promoCodeStats.current_uses}</p>
                <p><strong>Max Uses: </strong> {promoCodeStats.max_uses}</p>
                <p><strong>Usage Percentage: </strong> {promoCodeStats.usage_percentage}%</p>
              </div>
              <div>
                <p><strong>Users with this rate:</strong> {promoCodeStats.users_with_this_rate}</p>
                <p><strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${promoCodeStats.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {promoCodeStats.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
                <p><strong>Expired:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${promoCodeStats.is_expired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {promoCodeStats.is_expired ? 'Yes' : 'No'}
                  </span>
                </p>
                <p><strong>Maxed Out:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${promoCodeStats.is_maxed_out ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {promoCodeStats.is_maxed_out ? 'Yes' : 'No'}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-gray-800  dark:text-gray-300">
              <p><strong>Expires At:</strong> {new Date(promoCodeStats.expires_at).toLocaleDateString()}</p>
              <p><strong>Created At:</strong> {new Date(promoCodeStats.created_at).toLocaleDateString()}</p>
              {promoCodeStats.description && promoCodeStats.description !== "NULL" && (
                <p><strong>Description:</strong> {promoCodeStats.description}</p>
              )}
            </div>
          </div>
        ) : (
          <p>Loading stats...</p>
        )}
      </Modal>
    </div>
    </ComponentCard>
  );
}
