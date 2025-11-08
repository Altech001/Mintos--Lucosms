import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { ApiKeyPublic } from "../../lib/api/models";
import Button from "../../components/ui/button/Button";
import Modal from "../../components/ui/modal/Modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Skeleton from "../../components/ui/Skeleton";

export default function ApiKeysPage() {
  const { apiClient } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyPublic & { plain_key?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState<string | boolean>(false); // boolean for create, string for other actions by key ID

  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.api.apiKeys.apiKeysReadApiKeys({});
      setApiKeys(response.data);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to fetch API keys.");
    }
    setIsLoading(false);
  }, [apiClient]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName) {
      setError("Key name cannot be empty.");
      return;
    }
    setError(null);
    setIsMutating(true);
    try {
      const response = await apiClient.api.apiKeys.apiKeysCreateApiKey({ apiKeyCreate: { name: newKeyName } });
      setNewlyCreatedKey(response);
      setCreateModalOpen(false);
      setNewKeyName("");
      fetchApiKeys();
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to create API key.");
    }
    setIsMutating(false);
  };

  const handleDeleteKey = async (keyId: string) => {
    if (window.confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      setIsMutating(keyId);
      try {
        await apiClient.api.apiKeys.apiKeysDeleteApiKey({ apiKeyId: keyId });
        fetchApiKeys();
      } catch (err) {
        const anError = err as Error;
        setError(anError.message || "Failed to delete API key.");
      }
      setIsMutating(false);
    }
  };

  const handleRegenerateKey = async (keyId: string) => {
    if (window.confirm("Are you sure you want to regenerate this API key? The old key will be invalidated immediately.")) {
      setIsMutating(keyId);
      try {
        const response = await apiClient.api.apiKeys.apiKeysRegenerateApiKey({ apiKeyId: keyId });
        setNewlyCreatedKey(response);
        fetchApiKeys();
      } catch (err) {
        const anError = err as Error;
        setError(anError.message || "Failed to regenerate API key.");
      }
      setIsMutating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">API Keys</h1>
        <Button size="sm" onClick={() => setCreateModalOpen(true)}>Create API Key</Button>
      </div>

      {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">{error}</div>}

      <div className="overflow-x-auto bg-white rounded-lg shadow-md dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Name</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Key Prefix</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Created At</th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={index}>
                  <td className="px-6 py-4"><Skeleton className="w-24 h-5" /></td>
                  <td className="px-6 py-4"><Skeleton className="w-20 h-5" /></td>
                  <td className="px-6 py-4"><Skeleton className="w-20 h-5" /></td>
                  <td className="px-6 py-4"><Skeleton className="w-32 h-8" /></td>
                </tr>
              ))
            ) : (
              apiKeys.map((key) => (
              <tr key={key.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{key.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-mono">{key.prefix}...</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(key.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                  <Button variant="outline" size="sm" className="mr-2" onClick={() => handleRegenerateKey(key.id)} isLoading={isMutating === key.id}>Regenerate</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteKey(key.id)} isLoading={isMutating === key.id}>Delete</Button>
                </td>
              </tr>
            )))
          }
          </tbody>
        </table>
      </div>

      {/* Create Key Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New API Key">
        <div className="space-y-4">
          <div>
            <Label>Key Name</Label>
            <Input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g., My Awesome App" />
          </div>
          <div className="flex justify-end gap-4">
            <Button onClick={() => setCreateModalOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleCreateKey} isLoading={isMutating === true}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Show Newly Created Key Modal */}
      <Modal isOpen={!!newlyCreatedKey} onClose={() => setNewlyCreatedKey(null)} title="API Key Created Successfully">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Please copy your new API key. You will not be able to see it again.</p>
          <div className="p-3 font-mono text-sm bg-gray-100 rounded-md dark:bg-gray-700 dark:text-gray-300">
            {newlyCreatedKey?.plain_key}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setNewlyCreatedKey(null)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
