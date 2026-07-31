import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import { BarChart3, Zap, Shield, Globe, ChevronRight, Loader2 } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    email: "demo@eleventech.ao",
    password: "Demo2026!",
    name: "Carlos Mendes",
    role: "Analista",
    initials: "CM",
    gradient: "from-cyan-500 to-cyan-600",
    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    desc: "Acesso a Dashboard, Análise e Anomalias",
  },
  {
    email: "admin@eleventech.ao",
    password: "Admin2026!",
    name: "Ana Ferreira",
    role: "Administrador",
    initials: "AF",
    gradient: "from-indigo-500 to-indigo-600",
    badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    desc: "Acesso total incluindo Integrações e Gestão",
  },
];

export default function Login() {
  const { loginWithCredentials } = useAuth();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDemoLogin(account: (typeof DEMO_ACCOUNTS)[number]) {
    if (loadingEmail) return;
    setError(null);
    setLoadingEmail(account.email);
    try {
      await loginWithCredentials(account.email, account.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar.");
      setLoadingEmail(null);
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
          className="w-full max-w-md space-y-5"
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
              Selecione uma conta de demonstração para entrar
            </p>
          </div>

          {/* Demo account cards — one click login */}
          <div className="space-y-3">
            {DEMO_ACCOUNTS.map((account) => {
              const isLoading = loadingEmail === account.email;
              return (
                <motion.button
                  key={account.email}
                  onClick={() => handleDemoLogin(account)}
                  disabled={!!loadingEmail}
                  whileHover={{ scale: loadingEmail ? 1 : 1.01 }}
                  whileTap={{ scale: loadingEmail ? 1 : 0.99 }}
                  className="w-full text-left bg-[#111827] border border-white/10 hover:border-white/25 rounded-2xl p-5 transition-all duration-200 group disabled:opacity-60 disabled:cursor-wait shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${account.gradient} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-lg`}>
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        account.initials
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-white">{account.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${account.badge}`}>
                          {account.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{account.desc}</p>
                    </div>

                    {/* Arrow */}
                    <div className="shrink-0 text-gray-600 group-hover:text-gray-300 transition-colors">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  {isLoading && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-cyan-400 text-center">A autenticar e a carregar plataforma…</p>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <p className="text-center text-xs text-gray-600 pt-2">
            ELEVEN Technology · Plataforma de Inteligência de Dados
          </p>
        </motion.div>
      </div>
    </div>
  );
}
