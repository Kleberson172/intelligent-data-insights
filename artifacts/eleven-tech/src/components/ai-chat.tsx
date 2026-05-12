import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Upload, X, FileText, CheckCircle2, Paperclip } from "lucide-react";
import { useCreateOpenaiConversation, getGetOpenaiConversationQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function AIChatZone({ onPulse, onMessagesChange }: { onPulse?: () => void; onMessagesChange?: (msgs: Message[]) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [csvStatus, setCsvStatus] = useState<CsvStatus>({ loaded: false });
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
    if (!file.name.endsWith(".csv")) {
      alert("Por favor selecione um ficheiro CSV.");
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
        updateMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "assistant",
          content: `✅ Ficheiro **${data.filename}** carregado com sucesso!\n\n📊 **${data.rows.toLocaleString('pt-PT')} registros** | **${data.columns.length} colunas**: ${data.columns.slice(0, 6).join(", ")}${data.columns.length > 6 ? "..." : ""}\n\nAgora posso analisar os seus dados reais. O que gostaria de saber?`,
        }]);
        if (onPulse) onPulse();
      } else {
        alert(data.error || "Erro ao carregar ficheiro");
      }
    } catch {
      alert("Erro de rede ao carregar ficheiro");
    } finally {
      setUploading(false);
    }
  }, [onPulse]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput("");

    const tempUserMsgId = Date.now().toString();
    updateMessages(prev => [...prev, { id: tempUserMsgId, role: "user", content: userMsg }]);
    setIsTyping(true);

    try {
      let currentConvId = conversationId;

      if (!currentConvId) {
        const conv = await createConversation.mutateAsync({ data: { title: userMsg.slice(0, 50) } });
        currentConvId = conv.id;
        setConversationId(conv.id);
      }

      const tempAiMsgId = (Date.now() + 1).toString();
      updateMessages(prev => [...prev, { id: tempAiMsgId, role: "assistant", content: "" }]);

      const response = await fetch(`/api/openai/conversations/${currentConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
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
                if (onPulse) onPulse();
              }
            } catch {
              // incomplete chunk
            }
          }
        }
      }

    } catch (error) {
      updateMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "Erro ao processar a mensagem. Tente novamente." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-primary">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Card
      className={`flex flex-col border-primary/20 shadow-[0_0_30px_rgba(56,189,248,0.08)] overflow-hidden bg-card/50 backdrop-blur transition-all duration-500 ${isDragging ? 'ring-2 ring-primary border-primary' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/50 bg-card/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="text-primary w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <h2 className="text-sm font-bold text-foreground">Agente de IA — ELEVEN</h2>
        </div>
        <div className="flex items-center gap-2">
          {csvStatus.loaded ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs gap-1 px-2">
              <CheckCircle2 className="w-3 h-3" />
              {csvStatus.filename} · {csvStatus.rows?.toLocaleString('pt-PT')} linhas
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground gap-1 px-2">
              <FileText className="w-3 h-3" />
              vendas_angola.csv
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-primary text-xs gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "A carregar..." : "CSV"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-[220px] max-h-[380px] overflow-y-auto p-4 space-y-3" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm text-center px-6 gap-3 py-8"
            >
              <Bot className="w-10 h-10 text-primary/30" />
              <div>
                <p className="font-medium text-foreground/70 mb-1">Olá! Sou o Agente de IA da ELEVEN.</p>
                <p className="text-xs">Estou aqui para responder às suas dúvidas e analisar os seus dados. Pode também arrastar um ficheiro CSV aqui.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {["Qual foi o melhor mês de vendas?", "Quais províncias cresceram mais?", "Analisa as anomalias"].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-primary/20 text-primary/80 hover:bg-primary/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted/60 border border-border/40 text-foreground rounded-tl-sm"
                  }`}
                >
                  {renderMessageContent(msg.content)}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-secondary" />
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
            className="flex gap-2 justify-start"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/60 border border-border/40 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}

        {isDragging && (
          <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/50 rounded-xl flex items-center justify-center pointer-events-none">
            <div className="text-primary text-sm font-medium flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Solte o ficheiro CSV aqui
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-card/80 border-t border-border/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-primary"
            onClick={() => fileInputRef.current?.click()}
            title="Carregar CSV"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre os seus dados..."
            className="bg-background/50 border-border/50 focus-visible:ring-primary/50 h-10"
            disabled={isTyping}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />
          <Button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(56,189,248,0.25)] h-10 w-10 flex-shrink-0 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
