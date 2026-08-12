import { useState } from "react";
import { Plus, Search, SlidersHorizontal, ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { motion } from "framer-motion";

const PRODUCTS: { id: number; name: string; price: string; stock: string; emoji: string; category: string }[] = [];

export default function Products() {
  const [search, setSearch] = useState("");

  const filtered = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="Products" showSearch={false}>
      <div className="space-y-4">
        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 flex-wrap"
        >
          <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors">
            <SlidersHorizontal size={14} />
            Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors">
            <ArrowUpDown size={14} />
            Sort
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity ml-auto shadow-[0_0_20px_rgba(56,189,248,0.3)]">
            <Plus size={15} />
            Add New Product
          </button>
        </motion.div>

        {/* Product Grid */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-12 text-center"
          >
            <p className="text-sm text-gray-500">Nenhum produto registado ainda</p>
            <p className="text-xs text-gray-600 mt-1">Clique em "Add New Product" para começar</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="glass-card rounded-2xl p-5 hover:border-white/15 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-4xl flex-shrink-0">
                    {product.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-base leading-tight">{product.name}</h3>
                    <div className="text-2xl font-bold text-white mt-1">{product.price}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{product.stock}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  <span className="flex-1 text-xs text-gray-500">{product.category}</span>
                  <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
