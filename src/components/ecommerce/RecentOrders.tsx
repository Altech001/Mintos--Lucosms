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

interface SMSRecord {
  id: number;
  date: string;
  text: string;
  from: string;
  to: string;
  cost: number;
  status: "Delivered" | "Pending" | "Failed";
}

const tableData: SMSRecord[] = [
  {
    id: 1,
    date: "2024-01-15 10:30",
    text: "Your order #12345 has been shipped and will arrive within 2-3 business days",
    from: "ATUpdates",
    to: "+256700987654",
    cost: 32,
    status: "Delivered",
  },
  {
    id: 2,
    date: "2024-01-15 09:15",
    text: "Appointment reminder for tomorrow at 3:00 PM",
    from: "ATTech",
    to: "+256700987655",
    cost: 32,
    status: "Pending",
  }
];

export default function RecentOrders() {
  const [selectAll, setSelectAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(tableData.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
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
                className="py-3 px-4 font-medium text-white text-start text-theme-xs whitespace-nowrap"
              >
                <Checkbox 
                  checked={selectAll} 
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-white text-start text-theme-xs whitespace-nowrap"
              >
                Date
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-white text-start text-theme-xs whitespace-nowrap min-w-[300px]"
              >
                Text
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-white text-start text-theme-xs whitespace-nowrap"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-white text-start text-theme-xs whitespace-nowrap"
              >
                To
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-white text-start text-theme-xs whitespace-nowrap"
              >
                Cost
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 font-medium text-white text-start text-theme-xs whitespace-nowrap"
              >
                From
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tableData.map((sms) => (
              <TableRow key={sms.id}>
                <TableCell className="py-3 px-4">
                  <Checkbox 
                    checked={selectedItems.includes(sms.id)} 
                    onChange={(checked) => handleSelectItem(sms.id, checked)}
                  />
                </TableCell>
                <TableCell className="py-3 px-4 text-gray-700 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                  {sms.date}
                </TableCell>
                <TableCell className="py-3 px-4 text-gray-700 text-theme-sm dark:text-gray-300 min-w-[300px]">
                  <div className="line-clamp-1.8">
                    {sms.text}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-4">
                  <Badge
                    size="sm"
                    color={
                      sms.status === "Delivered"
                        ? "success"
                        : sms.status === "Pending"
                        ? "warning"
                        : "error"
                    }
                  >
                    {sms.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 px-4 text-gray-700 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                  {sms.to}
                </TableCell>
                <TableCell className="py-3 px-4 text-gray-700 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                  {sms.cost}
                </TableCell>
                <TableCell className="py-3 px-4 text-gray-700 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                  {sms.from}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}