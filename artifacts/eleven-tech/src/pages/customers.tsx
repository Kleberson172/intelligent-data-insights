import { useState } from "react";
import { Plus, Search, Filter, ChevronDown } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { motion } from "framer-motion";

const CUSTOMERS = [
  { id: "CUST-001", name: "Alice D.", email: "alice@example.com", phone: "+1 555-0101", location: "New York", status: "Active" },
  { id: "CUST-002", name: "Bob S.", email: "bob@example.com", phone: "+1 555-0101", location: "New York", status: "Active" },
  { id: "CUST-003", name: "Charlie K.", email: "charlie@example.com", phone: "+1 555-0101", location: "New York", status: "Active" },
  { id: "CUST-004", name: "David L.", email: "david@example.com", phone: "+1 555-0101", location: "New York", status: "Active" },
  { id: "CUST-005", name: "Alice D.", email: "alice2@example.com", phone: "+1 555-0101", location: "New York", status: "Active" },
  { id: "CUST-006", name: "Bob S.", email: "bob2@example.com", phone: "+1 555-0101", location: "New York", status: "Inactive" },
  { id: "CUST-007", name: "Alice D.", email: "alice3@example.com", phone: "+1 555-0101", location: "New York", status: "Active" },
  { id: "CUST-008", name: "Charlie K.", email: "charlie2@example.com", phone: "+1 555-0101", location: "New York", status: "Active" },
  { id: "CUST-009", name: "David L.", email: "david2@example.com", phone: "+1 555-0101", location: "New York", status: "Pending" },
];

const STATUS_COLORS: Record<string, string> = {
  Active: "text-green-400 bg-green-400/10 border-green-400/30",
  Inactive: "text-gray-400 bg-gray-400/10 border-gray-400/30",
  Pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
};

function FilterPill({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors">
      {label}
      <ChevronDown size={11} className="text-gray-500" />
    </button>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(c => c.id));
  };

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <AppLayout title="Customers" showSearch={false}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(56,189,248,0.3)]">
              <Plus size={14} />
              Add Customer
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FilterPill label="Status: Active" />
            <FilterPill label="Location: All" />
            <FilterPill label="Discounts: All" />
            <FilterPill label="Warranting: All" />
            <div className="ml-auto flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <Filter size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded border-white/20 bg-white/5 accent-cyan-500"
                  />
                </th>
                {["Customer ID", "Name", "Email", "Phone", "Location", "Status"].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                ))}
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={() => toggle(c.id)}
                      className="rounded border-white/20 bg-white/5 accent-cyan-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-3 text-gray-200 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.location}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-medium ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-gray-500 hover:text-white transition-colors">···</button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </AppLayout>
  );
}
