import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES, useTranslation, type LanguageCode } from "@/locales/i18n";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  variant?: "header" | "auth" | "settings" | "compact";
  className?: string;
}

export function LanguageSelector({ variant = "header", className }: LanguageSelectorProps) {
  const { language, setLanguage, currentLanguageOption } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === "settings") {
    return (
      <div className={cn("space-y-2", className)}>
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Globe className="size-3.5 text-primary" />
          <span>Language / மொழி / भाषा</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const selected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border text-left transition-all text-xs font-medium",
                  selected
                    ? "bg-primary/10 border-primary text-primary shadow-2xs font-semibold"
                    : "bg-card border-border hover:bg-muted/50 text-foreground",
                )}
              >
                <div>
                  <span className="block text-sm">{lang.nativeName}</span>
                  <span className="text-[11px] text-muted-foreground">{lang.name}</span>
                </div>
                {selected && <Check className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <Button
        type="button"
        variant={variant === "auth" ? "outline" : "ghost"}
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select application language / மொழியைத் தேர்ந்தெடுக்கவும் / भाषा चुनें"
        className={cn(
          "h-8 gap-1.5 text-xs font-medium transition-colors",
          variant === "auth"
            ? "border-border/60 bg-card/80 backdrop-blur shadow-2xs hover:bg-muted"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Globe className="size-3.5 text-primary" />
        <span className="font-semibold text-foreground">{currentLanguageOption.nativeName}</span>
        <ChevronDown className={cn("size-3 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-44 rounded-xl border bg-popover/95 backdrop-blur-md p-1.5 shadow-lg ring-1 ring-black/5 z-50 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b mb-1">
            Language / மொழி / भाषा
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="menuitem"
                onClick={() => handleSelectLanguage(lang.code)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted/70",
                )}
              >
                <div className="flex flex-col text-left">
                  <span className="font-medium text-xs">{lang.nativeName}</span>
                  {lang.code !== "en" && (
                    <span className="text-[10px] text-muted-foreground">{lang.name}</span>
                  )}
                </div>
                {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
