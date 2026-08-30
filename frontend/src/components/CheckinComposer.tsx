import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mic, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils"; // utility for classNames if exists

interface CheckinComposerProps {
  mode: string;
  onModeSelect: (mode: string) => void;
  onSubmit: (text: string) => void;
}

export const CheckinComposer = ({ mode, onModeSelect, onSubmit }: CheckinComposerProps) => {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(input.trim());
      setInput("");
    } finally {
      setSubmitting(false);
    }
  };

  const modes = [
    { key: "quick", label: "Quick", icon: Zap },
    { key: "voice", label: "Voice", icon: Mic },
    { key: "conversational", label: "Chat", icon: CheckCircle2 },
    { key: "detailed", label: "Detailed", icon: Loader2 },
    { key: "hub", label: "Hub", icon: Loader2 },
  ];

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex gap-1">
        {modes.map((m) => {
          const Icon = m.icon;
          const active = mode === m.key;
          return (
            <Button
              key={m.key}
              variant={active ? "default" : "outline"}
              size="icon"
              onClick={() => onModeSelect(m.key)}
              className={cn("rounded-full", active && "bg-primary text-primary-foreground")}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
        <Input
          placeholder="What would you like to log today?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting || !input.trim()}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  );
};
