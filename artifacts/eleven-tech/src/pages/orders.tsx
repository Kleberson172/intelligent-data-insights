import { useState } from "react";
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { motion } from "framer-motion";

const ORDERS = [
  { id: "ORD-001", customer: "Alice D.", date: "2023-03-23", status: "Pending", items: "Smart Watch X", total: "$120" },
  { id: "ORD-002", customer: "Bob S.", date: "2023-03-22", status: "Shipped", items: "Wireless Earbuds", total: "$85" },
  { id: "ORD-003", customer: "Charlie K.", date: "2023-03-22", status: "Delivered", items: "Portable Charger", total: "$210" },
  { id: "ORD-004", customer: "David L.", date: "2023-03-21", status: "Delivered", items: "Gaming Mouse", total: "$150" },
  { id: "ORD-005", customer: "Alice D.", date: "2023-03-21", status: "Shipped", items: "Wireless Earbuds", total: "$95" },
  { id: "ORD-006", customer: "David L.", date: "2023-03-22", status: "Delivered", items: "Gaming Mouse", total: "$150" },
  { id: "ORD-007", customer: "Alice D.", date: "2023-03-21", status: "Cancelled", items: "Smart Watch X", total: "$1,200" },
  { id: "ORD-008", customer: "Bob S.", date: "2023-03-21", status: "Delivered", items: "Portable Charger", total: "$1,200" },
  { id: "ORD-009", customer: "David L.", date: "2023-03-22", status: "Cancelled", items: "Gaming Mouse", total: "$650" },
];

const STATUS_COLORS: Record<string, string> = {
  Pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  Shipped: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Delivered: "text-green-400 bg-green-400/10 border-green-400/30",
  Cancelled: "text-red-400 bg-red-400/10 border-red-400/30",
  Processing: "text-purple-400 bg-purple-400/10 border-purple-400/30",
};

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = statusFilter === "All" ? ORDERS : ORDERS.filter(o => o.status === statusFilter);

  return (
    <AppLayout title="Orders">
      <div className="flex gap-4">
        {/* Main table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 glass-card rounded-2xl overflow-hidden"
        >
          {/* Filters */}
          <div className="flex items-center gap-3 p-4 border-b border-white/5 flex-wrap">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300">
              <span className="font-medium text-white">All Orders</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-400">
              Date Range
              <span className="text-gray-500">📅 – 📅</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Status</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none"
              >
                {["All", "Pending", "Shipped", "Delivered", "Cancelled"].map(s => (
                  <option key={s} value={s} className="bg-[#0e1020]">{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 ml-auto">
              <input type="text" placeholder="Search..." className="bg-transparent text-xs text-white placeholder-gray-500 outline-none w-28" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Order ID", "Customer", "Date", "Status", "Items", "Total", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{order.id}</td>
                    <td className="px-4 py-3 text-gray-200">{order.customer}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{order.date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full border text-[11px] font-medium ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{order.items}</td>
                    <td className="px-4 py-3 text-white font-semibold">{order.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 p-4 border-t border-white/5">
            <button className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={13} />
            </button>
            {[1, 2, 3].map(n => (
              <button key={n} className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${n === 1 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                {n}
              </button>
            ))}
            <span className="text-gray-500 text-xs">...</span>
            <button className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">9</button>
            <button className="flex items-center gap-1 px-3 h-7 rounded-lg bg-white/5 text-xs text-gray-400 hover:text-white transition-colors">
              Next <ChevronRight size={12} />
            </button>
          </div>
        </motion.div>

        {/* Stats sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-52 flex-shrink-0 space-y-3"
        >
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-white mb-4">Order Statistics</h4>
            <div className="space-y-5">
              <div>
                <div className="text-xs text-gray-400 mb-1">Total Orders Today</div>
                <div className="text-4xl font-bold text-white">45</div>
              </div>
              <div className="border-t border-white/5 pt-4">
                <div className="text-xs text-gray-400 mb-1">Pending Shipments</div>
                <div className="text-4xl font-bold text-white">12</div>
              </div>
              <div className="border-t border-white/5 pt-4">
                <div className="text-xs text-gray-400 mb-1">Returns</div>
                <div className="text-4xl font-bold text-white">3</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
