import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, Users, Clock, Trash2, RefreshCw, Loader2,
  LogOut, ScrollText, LogIn, CheckCircle2, XCircle,
  UserPlus, Pencil, X, UserCircle2,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SessionInfo {
  sid: string;
  fullSid: string;
  isDemo: boolean;
  expire: string;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
  } | null;
}

interface AuditLog {
  id: number;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

interface ManagedUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
}

function fetchSessions(): Promise<{ sessions: SessionInfo[] }> {
  return fetch("/api/admin/sessions", { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Erro ao carregar sessoes.");
    return r.json() as Promise<{ sessions: SessionInfo[] }>;
  });
}

function fetchAudit(): Promise<{ logs: AuditLog[] }> {
  return fetch("/api/admin/audit", { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Erro ao carregar auditoria.");
    return r.json() as Promise<{ logs: AuditLog[] }>;
  });
}

function fetchUsers(): Promise<{ users: ManagedUser[] }> {
  return fetch("/api/admin/users", { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Erro ao carregar utilizadores.");
    return r.json() as Promise<{ users: ManagedUser[] }>;
  });
}

function revokeSession(fullSid: string): Promise<void> {
  return fetch(`/api/admin/sessions/${fullSid}`, {
    method: "DELETE",
    credentials: "include",
  }).then((r) => {
    if (!r.ok) throw new Error("Erro ao revogar sessao.");
  });
}

interface UserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "Analista" | "Administrador";
}

function createUser(data: UserFormData): Promise<ManagedUser> {
  return fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then(async (r) => {
    const body = (await r.json()) as { user?: ManagedUser; error?: string };
    if (!r.ok) throw new Error(body.error ?? "Erro ao criar utilizador.");
    return body.user!;
  });
}

function updateUser(id: string, data: Partial<UserFormData>): Promise<ManagedUser> {
  return fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then(async (r) => {
    const body = (await r.json()) as { user?: ManagedUser; error?: string };
    if (!r.ok) throw new Error(body.error ?? "Erro ao atualizar utilizador.");
    return body.user!;
  });
}

function deleteUser(id: string): Promise<void> {
  return fetch(`/api/admin/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  }).then(async (r) => {
    if (!r.ok) {
      const body = (await r.json()) as { error?: string };
      throw new Error(body.error ?? "Erro ao eliminar utilizador.");
    }
  });
}

function formatExpiry(expire: string): string {
  const d = new Date(expire);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH > 24) return `${Math.floor(diffH / 24)}d ${diffH % 24}h`;
  if (diffH > 0) return `${diffH}h ${diffM}m`;
  return `${diffM}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sessionInitials(s: SessionInfo): string {
  if (!s.user) return "?";
  return `${s.user.firstName?.[0] ?? ""}${s.user.lastName?.[0] ?? ""}`.toUpperCase() || "U";
}

function sessionDisplayName(s: SessionInfo): string {
  if (!s.user) return "Utilizador desconhecido";
  return [s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || s.user.email || "-";
}

function userInitials(u: ManagedUser): string {
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase() || "U";
}

function userDisplayName(u: ManagedUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "-";
}

const ROLE_STYLES: Record<string, string> = {
  Administrador: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  Analista: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  login: { label: "Login", icon: LogIn, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  logout: { label: "Logout", icon: LogOut, color: "text-amber-400", bg: "bg-amber-500/10" },
  session_revoke: { label: "Sessao Revogada", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
  user_create: { label: "Utilizador Criado", icon: UserPlus, color: "text-green-400", bg: "bg-green-500/10" },
  user_update: { label: "Utilizador Atualizado", icon: Pencil, color: "text-blue-400", bg: "bg-blue-500/10" },
  user_delete: { label: "Utilizador Eliminado", icon: Trash2, color: "text-red-400", bg: "bg-red-500/10" },
};

type Tab = "users" | "sessions" | "audit";

const EMPTY_FORM: UserFormData = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "Analista",
};

export default function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("users");

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: fetchSessions,
    refetchInterval: 30000,
    enabled: tab === "sessions",
  });

  const auditQuery = useQuery({
    queryKey: ["admin-audit"],
    queryFn: fetchAudit,
    refetchInterval: 30000,
    enabled: tab === "audit",
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    enabled: tab === "users",
  });

  const revokeMutation = useMutation({
    mutationFn: (fullSid: string) => {
      setRevokingId(fullSid);
      return revokeSession(fullSid);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-audit"] });
    },
    onSettled: () => setRevokingId(null),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-audit"] });
      closeForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; data: Partial<UserFormData> }) => updateUser(vars.id, vars.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-audit"] });
      closeForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      setDeletingId(id);
      return deleteUser(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-audit"] });
    },
    onSettled: () => setDeletingId(null),
  });

  const sessions = sessionsQuery.data?.sessions ?? [];
  const auditLogs = auditQuery.data?.logs ?? [];
  const managedUsers = usersQuery.data?.users ?? [];

  const isLoading =
    tab === "sessions" ? sessionsQuery.isLoading :
    tab === "audit" ? auditQuery.isLoading :
    usersQuery.isLoading;
  const isFetching =
    tab === "sessions" ? sessionsQuery.isFetching :
    tab === "audit" ? auditQuery.isFetching :
    usersQuery.isFetching;
  const isError =
    tab === "sessions" ? sessionsQuery.isError :
    tab === "audit" ? auditQuery.isError :
    usersQuery.isError;

  function handleRefetch() {
    if (tab === "sessions") void sessionsQuery.refetch();
    else if (tab === "audit") void auditQuery.refetch();
    else void usersQuery.refetch();
  }

  function openCreateForm() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(u: ManagedUser) {
    setEditingUser(u);
    setForm({
      email: u.email ?? "",
      password: "",
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      role: u.role as "Analista" | "Administrador",
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (editingUser) {
      const data: Partial<UserFormData> = {
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
      };
      if (form.password) data.password = form.password;
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      if (!form.email || !form.password || !form.firstName || !form.lastName) {
        setFormError("Preencha todos os campos.");
        return;
      }
      createMutation.mutate(form);
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Gestao de Utilizadores</h1>
              <p className="text-sm text-gray-400">Contas, sessoes ativas e registo de auditoria</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tab === "users" && (
              <Button
                size="sm"
                onClick={openCreateForm}
                className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <UserPlus className="w-4 h-4" />
                Novo Utilizador
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefetch}
              disabled={isFetching}
              className="gap-2 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Atualizar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit border border-white/10">
          {(["users", "sessions", "audit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-white/10 text-white shadow"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "users" && <UserCircle2 className="w-4 h-4" />}
              {t === "sessions" && <Users className="w-4 h-4" />}
              {t === "audit" && <ScrollText className="w-4 h-4" />}
              {t === "users" ? "Utilizadores" : t === "sessions" ? "Sessoes em Curso" : "Registo de Auditoria"}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === "users" && (
          <Card className="bg-[#111827] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 text-gray-400" />
                Utilizadores
              </CardTitle>
              <CardDescription>
                Contas com acesso a plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  A carregar utilizadores...
                </div>
              ) : isError ? (
                <div className="text-center py-12 text-red-400 text-sm">
                  Erro ao carregar utilizadores.
                </div>
              ) : managedUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  Nenhum utilizador encontrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {managedUsers.map((u) => {
                    const isMe = u.id === user?.id;
                    const isDeleting = deletingId === u.id;

                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-4 p-4 rounded-xl border bg-white/3 border-white/8 hover:bg-white/5 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {userInitials(u)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white truncate">
                              {userDisplayName(u)}
                            </span>
                            {isMe && (
                              <Badge className="text-[10px] bg-cyan-500/15 text-cyan-400 border-cyan-500/30 px-1.5">
                                Voce
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{u.email}</div>
                        </div>

                        <Badge
                          className={`text-[10px] px-2 py-0.5 shrink-0 ${
                            ROLE_STYLES[u.role] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30"
                          }`}
                        >
                          {u.role}
                        </Badge>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(u)}
                          title="Editar utilizador"
                          className="shrink-0 h-8 w-8 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isDeleting || isMe}
                          onClick={() => {
                            if (confirm(`Eliminar o utilizador ${u.email}?`)) {
                              deleteMutation.mutate(u.id);
                            }
                          }}
                          title={isMe ? "Nao pode eliminar a sua propria conta" : "Eliminar utilizador"}
                          className="shrink-0 h-8 w-8 text-gray-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sessions Tab */}
        {tab === "sessions" && (
          <Card className="bg-[#111827] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Sessoes em Curso
              </CardTitle>
              <CardDescription>
                Todas as sessoes autenticadas atualmente validas no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  A carregar sessoes...
                </div>
              ) : isError ? (
                <div className="text-center py-12 text-red-400 text-sm">
                  Erro ao carregar sessoes. Verifique as permissoes.
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  Nenhuma sessao ativa encontrada.
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => {
                    const isMe = session.user?.id === user?.id;
                    const isRevoking = revokingId === session.fullSid;

                    return (
                      <div
                        key={session.fullSid}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                          isMe
                            ? "bg-cyan-500/5 border-cyan-500/20"
                            : "bg-white/3 border-white/8 hover:bg-white/5"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {sessionInitials(session)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white truncate">
                              {sessionDisplayName(session)}
                            </span>
                            {isMe && (
                              <Badge className="text-[10px] bg-cyan-500/15 text-cyan-400 border-cyan-500/30 px-1.5">
                                Voce
                              </Badge>
                            )}
                            {session.isDemo && (
                              <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30 px-1.5">
                                Demo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-500 truncate">
                              {session.user?.email ?? "-"}
                            </span>
                            <span className="text-gray-600">.</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expira em {formatExpiry(session.expire)}
                            </span>
                          </div>
                        </div>

                        {session.user?.role && (
                          <Badge
                            className={`text-[10px] px-2 py-0.5 shrink-0 ${
                              ROLE_STYLES[session.user.role] ??
                              "bg-gray-500/15 text-gray-400 border-gray-500/30"
                            }`}
                          >
                            {session.user.role}
                          </Badge>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isRevoking || isMe}
                          onClick={() => revokeMutation.mutate(session.fullSid)}
                          title={isMe ? "Nao pode revogar a sua propria sessao" : "Revogar sessao"}
                          className="shrink-0 h-8 w-8 text-gray-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                        >
                          {isRevoking ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audit Log Tab */}
        {tab === "audit" && (
          <Card className="bg-[#111827] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-gray-400" />
                Registo de Auditoria
              </CardTitle>
              <CardDescription>
                Ultimos 100 eventos registados no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  A carregar registos...
                </div>
              ) : isError ? (
                <div className="text-center py-12 text-red-400 text-sm">
                  Erro ao carregar auditoria.
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-500 text-sm gap-2">
                  <CheckCircle2 className="w-8 h-8 text-gray-700" />
                  Nenhum evento registado ainda.
                </div>
              ) : (
                <div className="space-y-1">
                  {auditLogs.map((log) => {
                    const meta = ACTION_META[log.action] ?? {
                      label: log.action,
                      icon: ScrollText,
                      color: "text-gray-400",
                      bg: "bg-gray-500/10",
                    };
                    const Icon = meta.icon;

                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/3 transition-colors group"
                      >
                        <div className={`mt-0.5 w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                            <span className="text-xs text-gray-300 truncate">
                              {log.userEmail ?? "-"}
                            </span>
                            {log.userRole && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${
                                  ROLE_STYLES[log.userRole] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30"
                                }`}
                              >
                                {log.userRole}
                              </span>
                            )}
                          </div>
                          {log.details && (
                            <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                          )}
                        </div>

                        <div className="text-right shrink-0 space-y-0.5">
                          <div className="text-[10px] text-gray-600 font-mono">
                            {formatDate(log.createdAt)}
                          </div>
                          {log.ip && (
                            <div className="text-[10px] text-gray-700 font-mono">{log.ip}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit User Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {editingUser ? "Editar Utilizador" : "Novo Utilizador"}
                </h2>
                <button onClick={closeForm} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {!editingUser && (
                  <div>
                    <Label className="text-xs text-gray-400">Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="bg-white/5 border-white/10 text-white mt-1"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-400">Nome</Label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="bg-white/5 border-white/10 text-white mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Apelido</Label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="bg-white/5 border-white/10 text-white mt-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-400">
                    {editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha"}
                  </Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="bg-white/5 border-white/10 text-white mt-1"
                    required={!editingUser}
                    minLength={6}
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-400">Papel</Label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as "Analista" | "Administrador" })}
                    className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="Analista">Analista</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>

                {formError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">
                    {formError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeForm}
                    className="flex-1 border-white/10 text-gray-400"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingUser ? "Guardar" : "Criar"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}