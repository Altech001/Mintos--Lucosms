import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import Checkbox from "../form/input/Checkbox";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from "@/lib/api/client";
import { SmsHistoryPublic } from "@/lib/api/models";



export default function RecentOrders() {
  const { user } = useAuth();
  const [selectAll, setSelectAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Fetch recent SMS history (last 2)
  const fetchRecentSms = async (): Promise<SmsHistoryPublic[]> => {
    const response = await apiClient.api.historySms.historysmsListMySmsHistory({ skip: 0, limit: 5 });
    return response.data;
  };

  const { data: recentSms = [], isLoading } = useQuery({
    queryKey: ['recentSms', user?.id],
    queryFn: fetchRecentSms,
    staleTime: 30_000,
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(recentSms.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
      setSelectAll(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent SMS Outbound
          </h3>
          <span className="text-gray-700 text-theme-sm dark:text-gray-300">
            View the last 2 recent SMS activities and their statuses
          </span>
        </div>

        <div className="flex items-center gap-3">

          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            Analyze Report
          </button>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto no-scrollbar">
        <Table className=" no-scrollbar">
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y bg-gray-100 dark:bg-gray-900">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-gray-700 dark:text-white text-start text-theme-xs whitespace-nowrap"
              >
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-gray-700 dark:text-white text-start text-theme-xs whitespace-nowrap"
              >
                Date
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-gray-700 dark:text-white text-start text-theme-xs whitespace-nowrap min-w-[300px]"
              >
                Text
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-gray-700 dark:text-white text-start text-theme-xs whitespace-nowrap"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-gray-700 dark:text-white text-start text-theme-xs whitespace-nowrap"
              >
                To
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-gray-700 dark:text-white text-start text-theme-xs whitespace-nowrap"
              >
                Cost
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-gray-700 dark:text-white text-start text-theme-xs whitespace-nowrap"
              >
                From
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Loading recent SMS...
                </TableCell>
              </TableRow>
            ) : recentSms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No recent SMS found
                </TableCell>
              </TableRow>
            ) : (
              recentSms.map((sms) => (
                <TableRow key={sms.id}>
                  <TableCell className="py-3 px-4">
                    <Checkbox
                      checked={selectedItems.includes(sms.id)}
                      onChange={(checked) => handleSelectItem(sms.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="py-3 px-4 text-gray-700 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                    {new Date(sms.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-gray-700 text-theme-sm dark:text-gray-300 min-w-[300px]">
                    <div className="line-clamp-1.8">
                      {sms.message}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <Badge
                      size="sm"
                      color={
                        sms.status === "delivered"
                          ? "success"
                          : sms.status === "pending"
                            ? "warning"
                            : "error"
                      }
                    >
                      {sms.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-gray-700 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                    {sms.recipient}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-gray-700 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                    {sms.cost}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-gray-700 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                    -
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}