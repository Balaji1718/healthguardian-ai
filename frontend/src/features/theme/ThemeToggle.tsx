import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "./theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "buttons" | "dropdown" | "compact";
  className?: string;
}

/**
 * Universal Theme Selector component (Light, Dark, System).
 */
export function ThemeToggle({ variant = "buttons", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Laptop },
  ];

  if (variant === "compact") {
    // Quick cycling button for headers
    const nextTheme: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const CurrentIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Laptop;

    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(nextTheme)}
        className={cn("size-8 rounded-full text-muted-foreground hover:text-foreground", className)}
        title={`Current theme: ${theme} (click to change)`}
        aria-label={`Current theme: ${theme}. Click to change to ${nextTheme}`}
      >
        <CurrentIcon className="size-4" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border bg-muted/40 p-1 text-xs",
        className,
      )}
      role="group"
      aria-label="Theme selection"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
              active
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
            )}
            aria-pressed={active}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
