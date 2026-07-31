import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Database,
  FileSpreadsheet,
  Globe,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  TestTube,
  Loader2,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Integration {
  id: number;
  name: string;
  type: string;
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiUrl?: string;
  isActive: boolean;
  lastTestedAt?: string;
  createdAt: string;
}

type IntegrationType = "postgresql" | "api" | "csv";

const TYPE_META: Record<IntegrationType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }> = {
  postgresql: {
    label: "PostgreSQL",
    icon: Database,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  api: {
    label: "API REST",
    icon: Globe,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
  },
  csv: {
    label: "Ficheiro CSV",
    icon: FileSpreadsheet,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "Nunca testado";
  const d = new Date(dateStr);
  return d.toLocaleString("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Integracoes() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "postgresql" as IntegrationType,
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    apiKey: "",
    apiUrl: "",
  });
  const [saving, setSaving] = useState(false);

  async function fetchIntegrations() {
    try {
      const res = await fetch("/api/integrations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as Integration[];
        setIntegrations(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchIntegrations();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const row = await res.json() as Integration;
        setIntegrations((prev) => [...prev, row]);
        setShowAdd(false);
        setForm({ name: "", type: "postgresql", host: "", port: "5432", database: "", username: "", password: "", apiKey: "", apiUrl: "" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(id: number) {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/integrations/${id}/test`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json() as { success: boolean; message: string };
      setTestResult({ id, ...data });
      await fetchIntegrations();
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await fetch(`/api/integrations/${id}`, { method: "DELETE", credentials: "include" });
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      if (testResult?.id === id) setTestResult(null);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Conexões de Dados</h1>
            <p className="text-muted-foreground mt-1">Gerencie as fontes de dados e credenciais da plataforma ELEVEN.</p>
          </div>
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-[#0a0e14] font-semibold gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Conexão
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: integrations.length, color: "text-white" },
            { label: "Ativas", value: integrations.filter((i) => i.isActive).length, color: "text-emerald-400" },
            { label: "Inativas", value: integrations.filter((i) => !i.isActive).length, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="border-white/10">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`text-2xl font-bold ${color}`}>{value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Integrations grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : integrations.length === 0 ? (
          <Card className="border-dashed border-white/20">
            <CardContent className="py-16 text-center">
              <Database className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma conexão configurada.</p>
              <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Conexão" para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {integrations.map((integration) => {
                const meta = TYPE_META[integration.type as IntegrationType] ?? TYPE_META.api;
                const Icon = meta.icon;
                const isTesting = testingId === integration.id;
                const isDeleting = deletingId === integration.id;
                const result = testResult?.id === integration.id ? testResult : null;

                return (
                  <motion.div
                    key={integration.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <Card className={`relative overflow-hidden border ${integration.isActive ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.07)]" : "border-white/10"}`}>
                      {/* Active/inactive indicator */}
                      <div className={`absolute top-3 right-3 flex items-center gap-1 text-xs font-medium ${integration.isActive ? "text-emerald-400" : "text-gray-500"}`}>
                        {integration.isActive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {integration.isActive ? "Ativo" : "Inativo"}
                      </div>

                      <CardHeader className="pb-3">
                        <div className={`w-11 h-11 ${meta.bg} ${meta.color} rounded-xl flex items-center justify-center mb-3`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-base pr-12">{integration.name}</CardTitle>
                        <CardDescription>
                          <Badge variant="outline" className={`text-xs ${meta.bg} ${meta.color} border-0`}>
                            {meta.label}
                          </Badge>
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {/* Connection details */}
                        <div className="space-y-1.5 text-xs">
                          {integration.type === "postgresql" && (
                            <>
                              {integration.host && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Host</span>
                                  <span className="font-mono text-foreground">{integration.host}:{integration.port ?? "5432"}</span>
                                </div>
                              )}
                              {integration.database && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Base de Dados</span>
                                  <span className="font-mono text-foreground">{integration.database}</span>
                                </div>
                              )}
                              {integration.username && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Utilizador</span>
                                  <span className="font-mono text-foreground">{integration.username}</span>
                                </div>
                              )}
                            </>
                          )}
                          {integration.type === "api" && (
                            <>
                              {integration.apiUrl && (
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground shrink-0">URL</span>
                                  <span className="font-mono text-foreground truncate">{integration.apiUrl}</span>
                                </div>
                              )}
                              {integration.apiKey && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">API Key</span>
                                  <span className="font-mono text-foreground">••••••••</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex justify-between pt-1 border-t border-white/5">
                            <span className="text-muted-foreground">Último teste</span>
                            <span className="text-foreground">{formatDate(integration.lastTestedAt)}</span>
                          </div>
                        </div>

                        {/* Test result */}
                        <AnimatePresence>
                          {result && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className={`flex items-start gap-2 p-2 rounded-lg text-xs ${result.success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
                            >
                              {result.success ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                              {result.message}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs bg-background hover:bg-muted gap-1.5"
                            disabled={isTesting}
                            onClick={() => handleTest(integration.id)}
                          >
                            {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                            Testar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 bg-background hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                            disabled={isDeleting}
                            onClick={() => handleDelete(integration.id)}
                          >
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add Integration Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md bg-[#111827] border-white/10">
          <DialogHeader>
            <DialogTitle>Nova Conexão</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da Conexão</Label>
              <Input
                placeholder="ex: DB Analytics Luanda"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-background border-white/10"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["postgresql", "api", "csv"] as IntegrationType[]).map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium ${
                        form.type === t
                          ? `${meta.bg} ${meta.border} ${meta.color} border`
                          : "border-white/10 text-muted-foreground hover:border-white/20"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {form.type === "postgresql" && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Host</Label>
                    <Input placeholder="localhost" value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} className="bg-background border-white/10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Porta</Label>
                    <Input placeholder="5432" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))} className="bg-background border-white/10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Base de Dados</Label>
                  <Input placeholder="analytics" value={form.database} onChange={(e) => setForm((f) => ({ ...f, database: e.target.value }))} className="bg-background border-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Utilizador</Label>
                    <Input placeholder="admin" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className="bg-background border-white/10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Palavra-passe</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        className="bg-background border-white/10 pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {form.type === "api" && (
              <>
                <div className="space-y-1.5">
                  <Label>URL da API</Label>
                  <Input placeholder="https://api.exemplo.com/v1" value={form.apiUrl} onChange={(e) => setForm((f) => ({ ...f, apiUrl: e.target.value }))} className="bg-background border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <Label>API Key (opcional)</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-••••••••"
                      value={form.apiKey}
                      onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                      className="bg-background border-white/10 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {form.type === "csv" && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-400 text-center">
                <FileSpreadsheet className="w-6 h-6 mx-auto mb-2" />
                Utilize o assistente de IA no Dashboard para carregar ficheiros CSV diretamente.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="bg-transparent">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || form.type === "csv"}
              className="bg-cyan-500 hover:bg-cyan-400 text-[#0a0e14] font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar Conexão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
