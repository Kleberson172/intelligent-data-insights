import { useLocation } from "wouter";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout";

export default function AccessDenied() {
  const [, navigate] = useLocation();
  return (
    <AppLayout title="Sem Acesso" showSearch={false}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldOff size={36} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-gray-400 max-w-sm">
            Não tem permissão para aceder a esta página.<br />
            Esta área está reservada aos Administradores.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
        >
          <ArrowLeft size={15} />
          Voltar ao Dashboard
        </button>
      </div>
    </AppLayout>
  );
}
