import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Loader2, Send, User, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUid } from "@/features/auth/useAuth";
import { runAgent, type AgentOutcome, type PendingAction } from "@/features/agent/agent";
import { TOOL_MAP } from "@/features/agent/tools";
import { addMessage, createSession, updateSession } from "@/services/firebase/repositories";
import { useAppStore } from "@/store/app";

export const Route = createFileRoute("/app/assistant")({
  component: Assistant,
  head: () => ({
    meta: [
      { title: "AI assistant — HealthGuardian AI" },
      { name: "description", content: "Ask about your own health data. The assistant explains and plans, and never diagnoses." },
      { property: "og:title", content: "Your health assistant" },
      { property: "og:description", content: "Grounded answers about your own logged health data." },
    ],
  }),
});

interface Bubble {
  role: "user" | "assistant";
  content: string;
  outcome?: AgentOutcome | undefined;
}

const SUGGESTIONS = [
  "How have I been doing this week?",
  "Explain my most recent report in simple words",
  "Help me build a better sleep routine",
  "Should I see a doctor about my recent readings?",
];

function Assistant() {
  const uid = useUid();
  const online = useAppStore((s) => s.online);
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    if (!uid || !text.trim() || busy) return;
    setInput("");
    setPending(null);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      let sid = sessionId;
      if (!sid) {
        sid = await createSession(uid, {
          title: text.slice(0, 60),
          userIntent: "general_conversation",
          status: "active",
        });
        setSessionId(sid);
      }
      await addMessage(uid, sid, { role: "user", content: text });
      const outcome = await runAgent({ uid, message: text, history });
      setMessages((m) => [...m, { role: "assistant", content: outcome.reply, outcome }]);
      setPending(outcome.pendingAction);
      await addMessage(uid, sid, {
        role: "assistant",
        content: outcome.reply,
        relatedRecordIds: outcome.relatedRecordIds,
      });
      await updateSession(uid, sid, { userIntent: outcome.intent, lastActivityAt: new Date() });
      if (!outcome.aiAvailable) {
        toast.warning("The AI service is unavailable, so I answered using your own data and local rules only.");
      }
    } catch {
      toast.error("The assistant could not complete that request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirmPending = async () => {
    if (!uid || !pending) return;
    const tool = TOOL_MAP.get(pending.tool);
    if (!tool) return;
    setBusy(true);
    try {
      const result = await tool.run(uid, pending.args);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: result.ok ? `Done — ${result.summary}` : `I couldn't do that: ${result.summary}` },
      ]);
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="AI assistant"
        description="Answers are grounded in your own records. The assistant never diagnoses, never prescribes and tells you when it is unsure."
      />

      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="surface p-6">
            <p className="text-sm text-muted-foreground">Try one of these to start:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => void send(s)} className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
            {m.role === "assistant" && <Bot className="mt-2 size-5 shrink-0 text-primary" />}
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm bg-card px-4 py-3 text-sm shadow-[var(--shadow-card)]"
              }
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.outcome && <Trace outcome={m.outcome} />}
            </div>
            {m.role === "user" && <User className="mt-2 ml-2 size-5 shrink-0 text-muted-foreground" />}
          </div>
        ))}

        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Working through your data…
          </p>
        )}

        {pending && (
          <div className="surface border-primary/40 p-4">
            <p className="text-sm">
              I can do this for you: <strong>{pending.description}</strong>
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => void confirmPending()} disabled={busy}>
                Yes, do it
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
                No thanks
              </Button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-0 mt-4 flex gap-2 bg-background pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <Textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={online ? "Ask about your health data…" : "You are offline — the assistant needs a connection."}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <Button type="submit" size="icon" className="h-auto w-12" disabled={busy || !input.trim()} aria-label="Send message">
          <Send className="size-4" />
        </Button>
      </form>

      <Disclaimer />
    </div>
  );
}

/** Transparency: which tools ran, which provider answered, and whether a fallback happened. */
function Trace({ outcome }: { outcome: AgentOutcome }) {
  const [open, setOpen] = useState(false);
  const provider = outcome.trace.find((t) => t.kind === "provider");
  return (
    <div className="mt-3 border-t pt-2">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <Wrench className="size-3.5" /> {outcome.usedTools.length} tool step(s)
        {provider?.provider ? ` · ${provider.provider}` : outcome.aiAvailable ? "" : " · offline reasoning"}
        <ChevronDown className={open ? "size-3.5 rotate-180" : "size-3.5"} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {outcome.trace.map((t, i) => (
            <li key={i} className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {t.kind}
              </Badge>
              <span>{t.label}</span>
              {t.status !== "ok" && <span className="text-destructive">{t.status}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
