import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import { BarChart3, Zap, Shield, Globe, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { loginWithCredentials } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await loginWithCredentials(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-indigo-500/5" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo-eleven.png" alt="ELEVEN" className="w-12 h-12 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]" />
          <div>
            <div className="font-bold text-white text-lg leading-none">ELEVEN</div>
            <div className="text-[10px] text-cyan-400 tracking-[0.3em] uppercase">Technology</div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-5xl font-black text-white leading-tight">
              Inteligência de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                Dados
              </span>{" "}
              para Angola
            </h1>
            <p className="mt-4 text-lg text-gray-400 leading-relaxed">
              Plataforma avançada de análise preditiva, deteção de anomalias e relatórios inteligentes em tempo real.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { icon: BarChart3, label: "Análise Preditiva", desc: "Modelos ML em tempo real" },
              { icon: Zap, label: "IA Generativa", desc: "Insights em português" },
              { icon: Shield, label: "Deteção de Anomalias", desc: "Alertas automáticos" },
              { icon: Globe, label: "18 Províncias", desc: "Cobertura nacional" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <Icon className="w-5 h-5 text-cyan-400 mb-2" />
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-xs text-gray-400">{desc}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 text-xs text-gray-600">
          © 2026 ELEVEN Technology · Luanda, Angola
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <img src="/logo-eleven.png" alt="ELEVEN" className="w-12 h-12 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]" />
            <div>
              <div className="font-bold text-white text-lg leading-none">ELEVEN</div>
              <div className="text-[10px] text-cyan-400 tracking-[0.3em] uppercase">Technology</div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Acesso à Plataforma</h2>
            <p className="text-gray-400 mt-1 text-sm">
              Entre com o seu email e palavra-passe
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@empresa.ao"
                  className="w-full bg-[#111827] border border-white/10 focus:border-cyan-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Palavra-passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#111827] border border-white/10 focus:border-cyan-500/50 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 disabled:opacity-60 disabled:cursor-wait text-white font-semibold text-sm rounded-xl py-3.5 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A autenticar…
                </>
              ) : (
                "Entrar"
              )}
            </motion.button>
          </form>

          <p className="text-center text-xs text-gray-600 pt-2">
            ELEVEN Technology · Plataforma de Inteligência de Dados
          </p>
        </motion.div>
      </div>
    </div>
  );
}
