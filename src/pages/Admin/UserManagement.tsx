
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import Modal from "../../components/ui/modal/Modal";
import Pagination from "../../components/ui/Pagination";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "@/lib/api/client";
import { UserCreate, UserPublic, UserUpdate } from "@/lib/api/models";
import FundsModal from "./modals/FundsModal";
import PlanModal from "./modals/PlanModal";
import UserForm from "./UserForm";

export default function UserManagementPage() {
  const { user } = useAuth();
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

  if (!user?.isSuperuser) {
    return (
      <div className="p-4 text-center text-red-500">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <ComponentCard title="User Management" desc="Manage users and other activities">
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div></div>
          <div className="flex flex-wrap items-center gap-4">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-auto appearance-none"
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" }
              ]}
              className="w-full border border-gray-300 rounded-md shadow-sm sm:w-auto focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <Button size="sm" onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>Add User</Button>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
            {(error as Error).message || "Failed to fetch users."}
          </div>
        )}

        <div className="overflow-x-auto bg-white rounded-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Full Name</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Email</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Status</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Role</th>
                <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4"><Skeleton className="w-24 h-5" /></td>
                    <td className="px-6 py-4"><Skeleton className="w-32 h-5" /></td>
                    <td className="px-6 py-4"><Skeleton className="w-16 h-5" /></td>
                    <td className="px-6 py-4"><Skeleton className="w-12 h-5" /></td>
                    <td className="px-6 py-4"><Skeleton className="w-32 h-8" /></td>
                  </tr>
                ))
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{u.fullName || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{u.isSuperuser ? 'Admin' : 'User'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" className="mr-2" onClick={() => { setEditingUser(u); setIsModalOpen(true); }}>Edit</Button>
                      <Button variant="outline" size="sm" className="mr-2" onClick={() => { setSelectedUser(u); setIsFundsModalOpen(true); }}>Funds</Button>
                      <Button variant="outline" size="sm" className="mr-2" onClick={() => { setSelectedUser(u); setIsPlanModalOpen(true); }}>Plan</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteUser(u.id)} isLoading={deleteUserMutation.isPending && deleteUserMutation.variables === u.id}>Delete</Button>
                    </td>
                  </tr>
                )))
              }
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />

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
      </ComponentCard>
    </div>
  );
}
