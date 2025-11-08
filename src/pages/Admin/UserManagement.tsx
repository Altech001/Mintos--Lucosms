import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { UserPublic, UserCreate, UserUpdate } from "../../lib/api/models";
import Button from "../../components/ui/button/Button";
import Modal from "../../components/ui/modal/Modal";
import UserForm from "./UserForm";
import Pagination from "../../components/ui/Pagination";
import Input from "../../components/form/input/InputField";
import Skeleton from "../../components/ui/Skeleton";
import FundsModal from "./modals/FundsModal";
import PlanModal from "./modals/PlanModal";

export default function UserManagementPage() {
  const { apiClient, user } = useAuth();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPublic | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, inactive
  const [roleFilter, setRoleFilter] = useState("all"); // all, admin, user
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState<string | boolean>(false); // boolean for create, string for update/delete by user ID
  const [isFundsModalOpen, setIsFundsModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserPublic | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all users since API doesn't support server-side search
      const response = await apiClient.api.users.usersReadUsers({ limit: 1000 }); // Adjust limit as needed
      setUsers(response.data);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to fetch users.");
    }
    setIsLoading(false);
  }, [apiClient]);

  useEffect(() => {
    if (user?.isSuperuser) {
      fetchUsers();
    }
  }, [user, fetchUsers]);

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

  const handleSaveUser = async (data: UserCreate | UserUpdate) => {
    const mutationId = editingUser ? editingUser.id : true;
    setIsMutating(mutationId);
    try {
      if (editingUser) {
        await apiClient.api.users.usersUpdateUser({ userId: editingUser.id, userUpdate: data as UserUpdate });
      } else {
        await apiClient.api.users.usersCreateUser({ userCreate: data as UserCreate });
      }
      fetchUsers();
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to save user.");
    }
    setIsMutating(false);
  };

  const handleAddFunds = async (amount: number) => {
    if (!selectedUser) return;
    setIsMutating(selectedUser.id);
    try {
      await apiClient.api.userData.adminAddFundsToWallet({ userId: selectedUser.id, addFundsRequest: { amount, } });
      fetchUsers();
      setIsFundsModalOpen(false);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to add funds.");
    }
    setIsMutating(false);
  };

  const handleDeductFunds = async (amount: number, reason: string) => {
    if (!selectedUser) return;
    setIsMutating(selectedUser.id);
    try {
      await apiClient.api.userData.adminDeductFundsFromWallet({ userId: selectedUser.id, deductFundsRequest: { amount, reason } });
      fetchUsers();
      setIsFundsModalOpen(false);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to deduct funds.");
    }
    setIsMutating(false);
  };

  const handleChangePlan = async (newPlan: string) => {
    if (!selectedUser) return;
    setIsMutating(selectedUser.id);
    try {
      await apiClient.api.userData.adminChangePlan({ userId: selectedUser.id, changePlanRequest: { newPlan } });
      fetchUsers();
      setIsPlanModalOpen(false);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to change plan.");
    }
    setIsMutating(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      setIsMutating(userId);
      try {
        await apiClient.api.users.usersDeleteUser({ userId });
        fetchUsers();
      } catch (err) {
        const anError = err as Error;
        setError(anError.message || "Failed to delete user.");
      }
      setIsMutating(false);
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
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">User Management</h1>
        <div className="flex flex-wrap items-center gap-4">
          <Input 
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-auto"
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-md shadow-sm sm:w-auto focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-md shadow-sm sm:w-auto focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <Button size="sm" onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>Add User</Button>
        </div>
      </div>

      {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">{error}</div>}

      <div className="overflow-x-auto bg-white rounded-lg shadow-md dark:bg-gray-800">
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
              <tr key={u.id}>
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
                  <Button variant="outline" size="sm" className="mr-2" onClick={() => { setSelectedUser(u); setIsFundsModalOpen(true); }}>Manage Funds</Button>
                  <Button variant="outline" size="sm" className="mr-2" onClick={() => { setSelectedUser(u); setIsPlanModalOpen(true); }}>Change Plan</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteUser(u.id)} isLoading={isMutating === u.id}>Delete</Button>
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
          isLoading={typeof isMutating === 'boolean' ? isMutating : isMutating === editingUser?.id}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
        />
      </Modal>

      {selectedUser && (
        <>
          <Modal isOpen={isFundsModalOpen} onClose={() => setIsFundsModalOpen(false)} title="Manage Funds">
            <FundsModal 
              user={selectedUser} 
              onClose={() => setIsFundsModalOpen(false)} 
              onAddFunds={handleAddFunds} 
              onDeductFunds={handleDeductFunds} 
              isMutating={isMutating === selectedUser.id}
            />
          </Modal>

          <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title="Change Plan">
            <PlanModal 
              user={selectedUser} 
              onClose={() => setIsPlanModalOpen(false)} 
              onChangePlan={handleChangePlan} 
              isMutating={isMutating === selectedUser.id}
            />
          </Modal>
        </>
      )}
    </div>
  );
}
