import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Bot, User, Upload, FileText, CheckCircle2, Paperclip,
  ChevronDown, HelpCircle, Lightbulb, Database, MessageSquare
} from "lucide-react";
import {
  useCreateOpenaiConversation,
  getGetOpenaiConversationQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetSalesDataQueryKey,
  getGetTopProductsQueryKey,
  getGetAnomalyStatsQueryKey,
  getGetSalesForecastQueryKey,
  getGetPredictionConfidenceQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface CsvStatus {
  loaded: boolean;
  filename?: string;
  rows?: number;
  columns?: string[];
}

const SUGESTOES = [
  { cat: "📊 Análise", q: "Qual foi o melhor mês de vendas em 2024?" },
  { cat: "📍 Províncias", q: "Quais províncias tiveram maior crescimento?" },
  { cat: "⚠️ Anomalias", q: "Existem anomalias nos dados de vendas?" },
  { cat: "📈 Tendência", q: "Qual é a tendência das vendas este ano?" },
  { cat: "🏆 Produtos", q: "Quais produtos vendem mais em Luanda?" },
  { cat: "💡 Insight", q: "Dá-me um resumo executivo dos dados" },
];

export function AIChatZone({ onPulse, onMessagesChange }: { onPulse?: () => void; onMessagesChange?: (msgs: Message[]) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [csvStatus, setCsvStatus] = useState<CsvStatus>({ loaded: false });
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessages(prev => {
      const next = updater(prev);
      onMessagesChange?.(next);
      return next;
    });
  }, [onMessagesChange]);

  const createConversation = useCreateOpenaiConversation();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/data/status").then(r => r.json()).then(setCsvStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      updateMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "⚠️ Por favor selecione um ficheiro no formato CSV.",
      }]);
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/data/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        setCsvStatus({ loaded: true, filename: data.filename, rows: data.rows, columns: data.columns });
        // Os dados carregados substituem o dataset de demonstração — invalida
        // as queries que dependem dele para a UI atualizar sozinha, sem o
        // utilizador ter de recarregar a página.
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSalesDataQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTopProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAnomalyStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSalesForecastQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPredictionConfidenceQueryKey() });
        updateMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "assistant",
          content: `✅ Ficheiro **${data.filename}** carregado com sucesso!\n\n📊 **${data.rows.toLocaleString("pt-PT")} registos** · **${data.columns.length} colunas**\nColunas: ${data.columns.slice(0, 6).join(", ")}${data.columns.length > 6 ? "…" : ""}\n\nAgora posso analisar os seus dados reais. Que análise pretende?`,
        }]);
        onPulse?.();
      } else {
        updateMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "assistant",
          content: `❌ Erro ao carregar ficheiro: ${data.error ?? "formato inválido"}.\n\nVerifique se o ficheiro está no formato CSV correcto (separador vírgula ou ponto-e-vírgula).`,
        }]);
      }
    } catch {
      updateMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "❌ Erro de ligação ao servidor. Tente novamente.",
      }]);
    } finally {
      setUploading(false);
    }
  }, [onPulse, queryClient, updateMessages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    setInput("");

    const tempUserMsgId = Date.now().toString();
    updateMessages(prev => [...prev, { id: tempUserMsgId, role: "user", content: text }]);
    setIsTyping(true);

    try {
      let currentConvId = conversationId;
      if (!currentConvId) {
        const conv = await createConversation.mutateAsync({ data: { title: text.slice(0, 50) } });
        currentConvId = conv.id;
        setConversationId(conv.id);
      }

      const tempAiMsgId = (Date.now() + 1).toString();
      updateMessages(prev => [...prev, { id: tempAiMsgId, role: "assistant", content: "" }]);

      const response = await fetch(`/api/openai/conversations/${currentConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!response.body) throw new Error("Sem corpo de resposta");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                updateMessages(prev =>
                  prev.map(msg =>
                    msg.id === tempAiMsgId
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  )
                );
              }
              if (data.done) {
                queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(currentConvId) });
                onPulse?.();
              }
            } catch { /* fragmento incompleto */ }
          }
        }
      }
    } catch {
      updateMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "❌ Erro ao obter resposta. Verifique a sua ligação e tente novamente.",
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [conversationId, createConversation, isTyping, onPulse, queryClient, updateMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const renderContent = (content: string) => {
    return content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i} className="font-semibold text-cyan-300">{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div
      className={`flex flex-col rounded-2xl border overflow-hidden bg-white/[0.03] backdrop-blur transition-all duration-300 ${
        isDragging
          ? "border-cyan-400/60 shadow-[0_0_30px_rgba(56,189,248,0.2)]"
          : "border-white/8 shadow-[0_4px_40px_rgba(0,0,0,0.3)]"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/8 bg-white/[0.02] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/20 flex items-center justify-center">
              <Bot className="text-cyan-400 w-4 h-4" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">Agente de IA — ELEVEN</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Responde em português · Analisa dados CSV</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {csvStatus.loaded ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
              <CheckCircle2 className="w-3 h-3" />
              {csvStatus.filename} · {csvStatus.rows?.toLocaleString("pt-PT")} linhas
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-500 text-[10px]">
              <Database className="w-3 h-3" />
              Dataset padrão Angola
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/15 transition-colors text-[10px] font-medium disabled:opacity-50"
          >
            <Upload className="w-3 h-3" />
            {uploading ? "A carregar…" : "CSV"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
          />
          <button
            onClick={() => setShowGuide(g => !g)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${showGuide ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5 text-gray-500 hover:text-gray-300"}`}
            title="Como usar"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Usage guide panel */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 bg-indigo-500/5 border-b border-white/5">
              <p className="text-[11px] font-semibold text-indigo-300 mb-3 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                Como usar o Agente de IA
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare className="w-3 h-3 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white mb-0.5">1. Faça perguntas</p>
                    <p className="text-[10px] text-gray-500">Escreva qualquer dúvida em português sobre vendas, clientes ou tendências de Angola.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white mb-0.5">2. Carregue os seus dados</p>
                    <p className="text-[10px] text-gray-500">Arraste um ficheiro CSV aqui ou clique em "CSV". O agente analisa os seus dados reais.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ChevronDown className="w-3 h-3 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white mb-0.5">3. Use as sugestões</p>
                    <p className="text-[10px] text-gray-500">Clique nas perguntas sugeridas em baixo para começar rapidamente com análises comuns.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        className="flex-1 min-h-[260px] max-h-[400px] overflow-y-auto p-4 space-y-3 scroll-smooth"
        ref={scrollRef}
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center px-6 gap-4 py-6"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border border-white/8 flex items-center justify-center">
                <Bot className="w-7 h-7 text-cyan-400/60" />
              </div>
              <div>
                <p className="font-semibold text-white/80 mb-1">Olá! Sou o Agente de IA da ELEVEN.</p>
                <p className="text-xs text-gray-500 max-w-xs">
                  Estou aqui para responder às suas dúvidas e analisar dados de negócio para Angola. Experimente uma das perguntas abaixo ou escreva a sua.
                </p>
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGESTOES.map(({ cat, q }) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border border-white/10 bg-white/3 text-gray-300 hover:border-cyan-500/40 hover:text-cyan-300 hover:bg-cyan-500/5 transition-all"
                  >
                    <span className="text-[10px]">{cat.split(" ")[0]}</span>
                    {q}
                  </button>
                ))}
              </div>

              {/* CSV hint */}
              {!csvStatus.loaded && (
                <div
                  className="mt-2 w-full max-w-sm border-2 border-dashed border-white/8 rounded-xl py-3 px-4 text-center cursor-pointer hover:border-cyan-500/30 hover:bg-cyan-500/3 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 text-gray-600 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-600">Arraste o seu ficheiro CSV aqui para análise dos seus dados reais</p>
                </div>
              )}
            </motion.div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500/15 to-indigo-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/20 text-white rounded-tr-sm"
                      : "bg-white/5 border border-white/8 text-gray-200 rounded-tl-sm"
                  }`}
                >
                  {msg.content === "" && msg.role === "assistant"
                    ? <span className="text-gray-500 italic text-xs">A processar…</span>
                    : renderContent(msg.content)
                  }
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600/40 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-indigo-300" />
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5 justify-start"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500/15 to-indigo-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white/5 border border-white/8 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}

        {isDragging && (
          <div className="absolute inset-0 bg-cyan-500/5 border-2 border-dashed border-cyan-400/50 rounded-2xl flex items-center justify-center pointer-events-none z-10">
            <div className="text-cyan-400 text-sm font-medium flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Solte o ficheiro CSV aqui
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 bg-black/20 border-t border-white/5">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 flex-shrink-0 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
            title="Carregar CSV"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva a sua pergunta em português…"
            className="flex-1 h-9 bg-white/5 border border-white/8 rounded-xl px-3.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-cyan-500/40 focus:bg-cyan-500/3 transition-all"
            disabled={isTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <Button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white hover:opacity-90 shadow-[0_0_15px_rgba(56,189,248,0.3)] disabled:opacity-30 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
