import { useState } from "react";
import { Camera } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { motion } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-gradient-to-r from-cyan-500 to-indigo-500" : "bg-white/10"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

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

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "John Smith"
  );
  const [email, setEmail] = useState(user?.email || "admin@example.com");
  const [theme, setTheme] = useState<"Dark" | "Light">("Dark");
  const [language, setLanguage] = useState("English");
  const [toggles, setToggles] = useState({
    changePassword: true,
    twoFA: true,
    notificationSecurity: false,
    emailNotif: true,
    pushNotif: true,
    notifSettings: true,
    notifTraoper: true,
  });

  const flip = (key: keyof typeof toggles) =>
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <AppLayout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Account */}
        <Section title="Account" delay={0}>
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {(user?.firstName?.[0] ?? "J")}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow">
                <Camera size={11} className="text-white" />
              </button>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                />
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
          <div className="flex justify-end mt-4">
            <button className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">
              Save Changes
            </button>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security" delay={0.06}>
          <div className="space-y-4">
            {[
              { label: "Change Password", key: "changePassword" as const },
              { label: "2FA Toggle", key: "twoFA" as const },
              { label: "Notification Settings", key: "notificationSecurity" as const, sub: "Show/change password for notifications" },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-200">{item.label}</div>
                  {item.sub && <div className="text-xs text-gray-500 mt-0.5">{item.sub}</div>}
                </div>
                <Toggle checked={toggles[item.key]} onChange={() => flip(item.key)} />
              </div>
            ))}
          </div>
        </Section>

        {/* Preferences */}
        <Section title="Preferences" delay={0.12}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-200">Language</span>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-gray-300 outline-none"
              >
                {["English", "Português", "French", "Spanish"].map(l => (
                  <option key={l} value={l} className="bg-[#0e1020]">{l}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-200">Theme</span>
              <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {(["Dark", "Light"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${theme === t ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-200">Notification Settings</span>
              <Toggle checked={toggles.notifSettings} onChange={() => flip("notifSettings")} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-200">Notification Trooper</span>
              <Toggle checked={toggles.notifTraoper} onChange={() => flip("notifTraoper")} />
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" delay={0.18}>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-200">Email</span>
              <Toggle checked={toggles.emailNotif} onChange={() => flip("emailNotif")} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-200">Push</span>
              <Toggle checked={toggles.pushNotif} onChange={() => flip("pushNotif")} />
            </div>
          </div>

          {/* Billing below */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <h4 className="text-white font-semibold mb-4">Billing</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Payment Method</span>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                  <span className="text-base">💳</span>
                  <span className="text-xs text-gray-300">•••• 4242</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Subscription</span>
                <span className="text-sm font-semibold text-white">$117.39 Month</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Next billing date</span>
                <span className="text-sm text-gray-300">June 1, 2026</span>
              </div>
            </div>
            <button className="mt-4 w-full py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors">
              Manage Billing
            </button>
          </div>
        </Section>
      </div>
    </AppLayout>
  );
}
