
import { apiClient } from "@/lib/api/client";
import { UserCreate, UserPublic, UserUpdate } from "@/lib/api/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Filter,
  Layers,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/button/Button";
import Modal from "../../components/ui/modal/Modal";
import Pagination from "../../components/ui/Pagination";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import FundsModal from "./modals/FundsModal";
import PlanModal from "./modals/PlanModal";
import UserForm from "./UserForm";

export default function UserManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPublic | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, inactive
  const [roleFilter, setRoleFilter] = useState("all"); // all, admin, user

  const [isFundsModalOpen, setIsFundsModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserPublic | null>(null);

  // Fetch users using React Query
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const response = await apiClient.api.users.usersReadUsers({ limit: 1000 });
      return response.data;
    },
    enabled: !!user?.isSuperuser,
  });

  // Mutations
  const saveUserMutation = useMutation({
    mutationFn: async (data: UserCreate | UserUpdate) => {
      if (editingUser) {
        return await apiClient.api.users.usersUpdateUser({ userId: editingUser.id, userUpdate: data as UserUpdate });
      } else {
        return await apiClient.api.users.usersCreateUser({ userCreate: data as UserCreate });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsModalOpen(false);
      setEditingUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiClient.api.users.usersDeleteUser({ userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
  });

  const addFundsMutation = useMutation({
    mutationFn: async ({ userId, amount, reason }: { userId: string, amount: number, reason?: string }) => {
      return await apiClient.api.userData.userDataAdminAddFundsToWallet({
        userId,
        addFundsRequest: {
          amount,
          referenceNumber: reason || 'Admin funds adjustment',
          paymentMethod: 'admin_adjustment'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsFundsModalOpen(false);
    },
  });

  const deductFundsMutation = useMutation({
    mutationFn: async ({ userId, amount, reason }: { userId: string, amount: number, reason: string }) => {
      return await apiClient.api.userData.userDataAdminDeductFundsFromWallet({
        userId,
        deductFundsRequest: {
          amount,
          reason
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsFundsModalOpen(false);
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ userId, newPlan }: { userId: string, newPlan: string }) => {
      return await apiClient.api.userData.userDataAdminChangePlan({
        userId,
        changePlanRequest: {
          newPlan
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsPlanModalOpen(false);
    },
  });

  // Handlers
  const handleSaveUser = (data: UserCreate | UserUpdate) => {
    saveUserMutation.mutate(data);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleAddFunds = async (amount: number, reason: string) => {
    if (selectedUser) {
      await addFundsMutation.mutateAsync({ userId: selectedUser.id, amount, reason });
    }
  };

  const handleDeductFunds = async (amount: number, reason: string) => {
    if (selectedUser) {
      await deductFundsMutation.mutateAsync({ userId: selectedUser.id, amount, reason });
    }
  };

  const handleChangePlan = async (newPlan: string) => {
    if (selectedUser) {
      await changePlanMutation.mutateAsync({ userId: selectedUser.id, newPlan });
    }
  };

  // Filtering
  const filteredUsers = users.filter(u => {
    const searchMatch =
      (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && u.isActive) ||
      (statusFilter === "inactive" && !u.isActive);

    const roleMatch =
      roleFilter === "all" ||
      (roleFilter === "admin" && u.isSuperuser) ||
      (roleFilter === "user" && !u.isSuperuser);

    return searchMatch && statusMatch && roleMatch;
  });

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Stats calculation
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const adminUsers = users.filter(u => u.isSuperuser).length;

  if (!user?.isSuperuser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-50 rounded-full dark:bg-red-500/10">
              <ShieldCheck className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: number, icon: any, colorClass: string }) => (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-none shadow-theme-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
        </div>
        <div className={`p-3 rounded-none ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-[10px] font-bold ">Dashboard / Administration / Users</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/services')}
            startIcon={<Layers className="w-4 h-4" />}
          >
            Services
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
            startIcon={<UserPlus className="w-4 h-4" />}
          >
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          colorClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
        />
        <StatCard
          title="Active Users"
          value={activeUsers}
          icon={UserCheck}
          colorClass="bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
        />
        <StatCard
          title="Administrators"
          value={adminUsers}
          icon={ShieldCheck}
          colorClass="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        />
      </div>

      {/* Main Table Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-theme-xs overflow-hidden">
        {/* Table Filters Header */}
        <div className="p-6 border-b border-gray-50 dark:border-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="SEARCH USERS BY NAME OR EMAIL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none uppercase tracking-wide bg-gray-25 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-gray-25 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-2 pl-3 pr-8 text-[10px] font-bold text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="all">ALL STATUSES</option>
                  <option value="active">ACTIVE ONLY</option>
                  <option value="inactive">INACTIVE ONLY</option>
                </select>
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none bg-gray-25 dark:bg-gray-800 border-gray-200 dark:border-gray-700 py-2 pl-3 pr-8 text-[10px] font-bold text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="all">ALL ROLES</option>
                <option value="admin">ADMINS</option>
                <option value="user">USERS</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-6 p-4 text-sm text-red-700 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/50">
            {(error as Error).message || "An unexpected error occurred while fetching users."}
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead className="bg-gray-25 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left">User Profile</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left">Email Address</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4"><Skeleton className="w-32 h-5" /></td>
                    <td className="px-6 py-4"><Skeleton className="w-40 h-5" /></td>
                    <td className="px-6 py-4"><Skeleton className="w-20 h-5" /></td>
                    <td className="px-6 py-4"><Skeleton className="w-16 h-5" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="inline-block w-24 h-8" /></td>
                  </tr>
                ))
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-25 dark:hover:bg-gray-800/40 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                          {u.fullName?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">{u.fullName || 'UNKNOWN USER'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 lowercase">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${u.isActive ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest ${u.isSuperuser ? 'text-brand-600' : 'text-gray-500'}`}>
                        {u.isSuperuser ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(u); setIsFundsModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Manage Funds"
                        >
                          <Wallet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(u); setIsPlanModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Change Plan"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete User"
                          disabled={deleteUserMutation.isPending && deleteUserMutation.variables === u.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Mobile Actions (Always Visible) */}
                      <div className="flex items-center justify-end gap-2 lg:hidden">
                        <Button variant="outline" size="sm" className="px-2 py-1" onClick={() => { setEditingUser(u); setIsModalOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                )))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-6 border-t border-gray-50 dark:border-gray-800 bg-gray-25 dark:bg-gray-800/50">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? "Edit User" : "Add User"}>
          <UserForm
            user={editingUser}
            onSave={handleSaveUser}
            isLoading={saveUserMutation.isPending}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingUser(null);
            }}
          />
        </Modal>

        {selectedUser && (
          <>
            <Modal isOpen={isFundsModalOpen} onClose={() => setIsFundsModalOpen(false)} title={`Manage Funds - ${selectedUser.fullName}`}>
              <FundsModal
                user={selectedUser}
                onClose={() => setIsFundsModalOpen(false)}
                onAddFunds={handleAddFunds}
                onDeductFunds={handleDeductFunds}
                isMutating={addFundsMutation.isPending || deductFundsMutation.isPending}
              />
            </Modal>

            <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title={`Change Plan - ${selectedUser.fullName}`}>
              <PlanModal
                user={selectedUser}
                onClose={() => setIsPlanModalOpen(false)}
                onChangePlan={handleChangePlan}
                isMutating={changePlanMutation.isPending}
              />
            </Modal>
          </>
        )}
      </div>
    </div>
  );
}
