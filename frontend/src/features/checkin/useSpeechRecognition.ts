import { useEffect, useRef, useState, useCallback } from "react";

export interface SpeechLanguage {
  code: string;
  label: string;
  name: string;
}

export const SUPPORTED_SPEECH_LANGUAGES: SpeechLanguage[] = [
  { code: "en-IN", label: "English", name: "English" },
  { code: "ta-IN", label: "தமிழ்", name: "தமிழ் (Tamil)" },
  { code: "hi-IN", label: "हिन्दी", name: "हिन्दी (Hindi)" },
];

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  language: string;
  setLanguage: (lang: string) => void;
  setTranscript: (text: string) => void;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string; confidence: number };
    };
  };
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface WindowWithSpeech {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("en-IN");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as WindowWithSpeech).SpeechRecognition ||
      (window as unknown as WindowWithSpeech).webkitSpeechRecognition,
    );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error if already stopped
      }
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const reset = useCallback(() => {
    stopListening();
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, [stopListening]);

  const startListening = useCallback(() => {
    setError(null);
    setInterimTranscript("");

    if (!isSupported) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    try {
      const win = window as unknown as WindowWithSpeech;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        setError("Voice input is not supported in this browser.");
        return;
      }
      const instance: SpeechRecognitionInstance = new SpeechRecognitionClass();

      instance.continuous = true;
      instance.interimResults = true;
      instance.lang = language;

      instance.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      instance.onresult = (event: SpeechRecognitionEvent) => {
        let finalChunk = "";
        let interimChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result) {
            if (result.isFinal && result[0]) {
              finalChunk += result[0].transcript + " ";
            } else if (result[0]) {
              interimChunk += result[0].transcript;
            }
          }
        }

        if (finalChunk) {
          setTranscript((prev) =>
            prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim(),
          );
        }
        setInterimTranscript(interimChunk);
      };

      instance.onerror = (event: { error: string; message?: string }) => {
        if (event.error === "no-speech") {
          setError("No speech was detected. Please try again or type naturally.");
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError(
            "Microphone permission was denied. Please allow microphone access or type naturally.",
          );
        } else if (event.error === "network") {
          setError(
            "Speech recognition service network error. You can type naturally or use Quick Check-in.",
          );
        } else {
          setError(`Voice input error: ${event.error}. You can type naturally instead.`);
        }
        setIsListening(false);
      };

      instance.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = instance;
      instance.start();
    } catch {
      setError(
        "Could not start speech recognition. Please check microphone permissions or type naturally.",
      );
      setIsListening(false);
    }
  }, [isSupported, language]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort on cleanup
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    language,
    setLanguage,
    setTranscript,
    startListening,
    stopListening,
    reset,
  };
}
