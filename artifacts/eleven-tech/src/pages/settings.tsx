import { useState } from "react";
import { Camera, Loader2, CheckCircle2, XCircle, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { motion } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card rounded-2xl p-5"
    >
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

function FeedbackLine({ status }: { status: { type: "success" | "error"; text: string } | null }) {
  if (!status) return null;
  return (
    <div className={`flex items-center gap-1.5 text-xs mt-2 ${status.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
      {status.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {status.text}
    </div>
  );
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  // -------------------- Perfil --------------------
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, email }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        setProfileStatus({ type: "success", text: "Perfil atualizado com sucesso." });
      } else {
        setProfileStatus({ type: "error", text: data.error ?? "Erro ao atualizar perfil." });
      }
    } catch {
      setProfileStatus({ type: "error", text: "Erro de ligação ao servidor." });
    } finally {
      setSavingProfile(false);
    }
  }

  // -------------------- Mudar palavra-passe --------------------
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleChangePassword() {
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", text: "As palavras-passe novas não coincidem." });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordStatus({ type: "success", text: "Palavra-passe alterada com sucesso." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordStatus({ type: "error", text: data.error ?? "Erro ao alterar a palavra-passe." });
      }
    } catch {
      setPasswordStatus({ type: "error", text: "Erro de ligação ao servidor." });
    } finally {
      setChangingPassword(false);
    }
  }

  // -------------------- 2FA --------------------
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [startingSetup, setStartingSetup] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disabling, setDisabling] = useState(false);

  async function handleStart2FASetup() {
    setStartingSetup(true);
    setTwoFactorStatus(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorSetup({ secret: data.secret, qrCodeDataUrl: data.qrCodeDataUrl });
      } else {
        setTwoFactorStatus({ type: "error", text: data.error ?? "Erro ao iniciar configuração do 2FA." });
      }
    } catch {
      setTwoFactorStatus({ type: "error", text: "Erro de ligação ao servidor." });
    } finally {
      setStartingSetup(false);
    }
  }

  async function handleVerify2FA() {
    setVerifyingCode(true);
    setTwoFactorStatus(null);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: twoFactorCode }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        setTwoFactorSetup(null);
        setTwoFactorCode("");
        setTwoFactorStatus({ type: "success", text: "Autenticação de dois fatores ativada com sucesso." });
      } else {
        setTwoFactorStatus({ type: "error", text: data.error ?? "Código incorreto." });
      }
    } catch {
      setTwoFactorStatus({ type: "error", text: "Erro de ligação ao servidor." });
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleDisable2FA() {
    setDisabling(true);
    setTwoFactorStatus(null);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        setShowDisableForm(false);
        setDisablePassword("");
        setTwoFactorStatus({ type: "success", text: "Autenticação de dois fatores desativada." });
      } else {
        setTwoFactorStatus({ type: "error", text: data.error ?? "Palavra-passe incorreta." });
      }
    } catch {
      setTwoFactorStatus({ type: "error", text: "Erro de ligação ao servidor." });
    } finally {
      setDisabling(false);
    }
  }

  function handleCopySecret() {
    if (!twoFactorSetup) return;
    navigator.clipboard.writeText(twoFactorSetup.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }

  return (
    <AppLayout title="Definições">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Perfil */}
        <Section title="Perfil" delay={0}>
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {(firstName?.[0] ?? "?").toUpperCase()}
              </div>
              <button
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow opacity-50 cursor-not-allowed"
                title="Upload de foto ainda não disponível"
                disabled
              >
                <Camera size={11} className="text-white" />
              </button>
            </div>
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Nome</label>
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Apelido</label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>
          </div>
          <FeedbackLine status={profileStatus} />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar Alterações
            </button>
          </div>
        </Section>

        {/* Segurança: palavra-passe */}
        <Section title="Alterar Palavra-passe" delay={0.06}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Palavra-passe atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nova palavra-passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Confirmar nova</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>
          </div>
          <FeedbackLine status={passwordStatus} />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {changingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Alterar Palavra-passe
            </button>
          </div>
        </Section>

        {/* 2FA */}
        <Section title="Autenticação de Dois Fatores (2FA)" delay={0.12}>
          {user?.twoFactorEnabled ? (
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <ShieldCheck className="w-4 h-4" /> A tua conta está protegida com 2FA.
              </div>
              {!showDisableForm ? (
                <button
                  onClick={() => setShowDisableForm(true)}
                  className="mt-4 text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5"
                >
                  <ShieldOff className="w-3.5 h-3.5" /> Desativar 2FA
                </button>
              ) : (
                <div className="mt-4 space-y-2">
                  <label className="text-xs text-gray-400 mb-1 block">Confirme a sua palavra-passe para desativar</label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={e => setDisablePassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDisable2FA}
                      disabled={disabling || !disablePassword}
                      className="px-4 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {disabling && <Loader2 className="w-3 h-3 animate-spin" />}
                      Confirmar
                    </button>
                    <button
                      onClick={() => { setShowDisableForm(false); setDisablePassword(""); }}
                      className="px-4 py-1.5 rounded-lg border border-white/10 text-gray-300 text-xs hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : twoFactorSetup ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Digitalize este código com uma app de autenticação (Google Authenticator, Authy, etc.) e introduza o código gerado para confirmar.
              </p>
              <div className="flex justify-center bg-white p-3 rounded-xl w-fit mx-auto">
                <img src={twoFactorSetup.qrCodeDataUrl} alt="QR Code 2FA" className="w-40 h-40" />
              </div>
              <div className="flex items-center gap-2 justify-center">
                <code className="text-xs text-gray-300 bg-white/5 px-2 py-1 rounded">{twoFactorSetup.secret}</code>
                <button onClick={handleCopySecret} title="Copiar código">
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-white" />}
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Código de 6 dígitos</label>
                <input
                  value={twoFactorCode}
                  onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors tracking-widest text-center"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleVerify2FA}
                  disabled={verifyingCode || twoFactorCode.length !== 6}
                  className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifyingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar e Ativar
                </button>
                <button
                  onClick={() => { setTwoFactorSetup(null); setTwoFactorCode(""); }}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-400 mb-3">
                Adiciona uma camada extra de segurança à tua conta, exigindo um código gerado por uma app de autenticação além da palavra-passe.
              </p>
              <button
                onClick={handleStart2FASetup}
                disabled={startingSetup}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {startingSetup && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ativar 2FA
              </button>
            </div>
          )}
          <FeedbackLine status={twoFactorStatus} />
        </Section>
      </div>
    </AppLayout>
  );
}
