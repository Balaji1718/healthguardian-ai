import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Check,
  Globe,
  Sparkles,
  Volume2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  SUPPORTED_SPEECH_LANGUAGES,
  useSpeechRecognition,
} from "@/features/checkin/useSpeechRecognition";

export interface VoiceRecorderProps {
  onTranscriptReady: (transcript: string, language: string) => void;
  onCancel: () => void;
}

type RecorderState = "idle" | "recording" | "paused" | "stopped";

export function VoiceRecorderWaveform({ onTranscriptReady, onCancel }: VoiceRecorderProps) {
  const speech = useSpeechRecognition();
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [editableTranscript, setEditableTranscript] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Sync transcript to editable state when new words arrive
  useEffect(() => {
    if (speech.transcript) {
      setEditableTranscript(speech.transcript);
    }
  }, [speech.transcript]);

  // Timer management
  useEffect(() => {
    if (recorderState === "recording") {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recorderState]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder.toString().padStart(2, "0")}`;
  };

  // Start recording
  const handleStartRecording = useCallback(async () => {
    speech.reset();
    setElapsedSeconds(0);
    setEditableTranscript("");
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
      setMediaUrl(null);
    }
    audioChunksRef.current = [];

    // Optional audio capture for local preview
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            const url = URL.createObjectURL(audioBlob);
            setMediaUrl(url);
          }
          // Stop stream tracks
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(200);
      } catch (err) {
        console.warn("MediaRecorder audio preview not available:", err);
      }
    }

    speech.startListening();
    setRecorderState("recording");
  }, [speech, mediaUrl]);

  // Pause recording
  const handlePauseRecording = () => {
    speech.stopListening();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }
    setRecorderState("paused");
  };

  // Resume recording
  const handleResumeRecording = () => {
    speech.startListening();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }
    setRecorderState("recording");
  };

  // Finish / Stop recording
  const handleStopRecording = () => {
    speech.stopListening();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecorderState("stopped");
  };

  // Cancel / Delete
  const handleCancel = () => {
    speech.reset();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
      setMediaUrl(null);
    }
    setRecorderState("idle");
    setElapsedSeconds(0);
    setEditableTranscript("");
    onCancel();
  };

  // Audio preview toggle
  const togglePlayAudio = () => {
    if (!mediaUrl) return;
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(mediaUrl);
      audioElementRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElementRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Auto-start on mount if idle
  useEffect(() => {
    if (recorderState === "idle") {
      void handleStartRecording();
    }
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-2xl border bg-card/95 backdrop-blur-md p-4 shadow-md transition-all space-y-4">
      {/* Header with Language Selector & Accessibility Status */}
      <div className="flex items-center justify-between border-b pb-3 text-xs">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[11px] gap-1 font-medium bg-primary/5 text-primary border-primary/20"
          >
            <Mic className="size-3" /> Voice Check-in
          </Badge>
          <span className="text-muted-foreground text-[11px]">
            {recorderState === "recording" && "Recording in progress"}
            {recorderState === "paused" && "Recording paused"}
            {recorderState === "stopped" && "Ready to verify"}
          </span>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1.5">
          <Globe className="size-3 text-muted-foreground" />
          <select
            value={speech.language}
            onChange={(e) => speech.setLanguage(e.target.value)}
            disabled={recorderState === "recording"}
            className="text-xs bg-transparent border-0 font-medium text-foreground cursor-pointer focus:outline-none"
            aria-label="Speech recognition language"
          >
            {SUPPORTED_SPEECH_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-background text-foreground">
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Notice */}
      {speech.error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">{speech.error}</p>
            <p className="text-[11px] text-muted-foreground">
              You can type naturally in the input box instead.
            </p>
          </div>
        </div>
      )}

      {/* Active Recording / Paused Bar (WhatsApp-style) */}
      {(recorderState === "recording" || recorderState === "paused") && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border">
          {/* Timer & Pulsing indicator */}
          <div className="flex items-center gap-2 min-w-[70px]">
            <span
              className={`size-2.5 rounded-full ${
                recorderState === "recording" ? "bg-red-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="font-mono text-xs font-semibold text-foreground" aria-live="polite">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          {/* Animated Waveform Equalizer */}
          <div className="flex-1 flex items-center justify-center gap-1 h-8 px-2 overflow-hidden">
            {[40, 70, 30, 90, 60, 100, 45, 80, 55, 95, 35, 75, 50, 85, 65, 90, 40, 70, 80, 50].map(
              (height, idx) => (
                <span
                  key={idx}
                  className={`w-1 rounded-full bg-primary/70 transition-all duration-200 ${
                    recorderState === "recording" ? "animate-pulse" : "opacity-40"
                  }`}
                  style={{
                    height: recorderState === "recording" ? `${height}%` : "30%",
                    animationDelay: `${(idx % 5) * 100}ms`,
                  }}
                />
              ),
            )}
          </div>

          {/* WhatsApp style Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Delete / Cancel */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="size-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Cancel recording"
              aria-label="Cancel recording"
            >
              <Trash2 className="size-4" />
            </Button>

            {/* Pause / Resume */}
            {recorderState === "recording" ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePauseRecording}
                className="size-8 rounded-full text-foreground border-border"
                title="Pause recording"
                aria-label="Pause recording"
              >
                <Pause className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleResumeRecording}
                className="size-8 rounded-full text-primary border-primary/30 bg-primary/5"
                title="Resume recording"
                aria-label="Resume recording"
              >
                <Play className="size-4" />
              </Button>
            )}

            {/* Finish / Stop */}
            <Button
              type="button"
              variant="default"
              size="icon"
              onClick={handleStopRecording}
              className="size-8 rounded-full bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
              title="Finish recording"
              aria-label="Finish recording"
            >
              <Square className="size-3.5 fill-current" />
            </Button>
          </div>
        </div>
      )}

      {/* Stopped / Transcript Verification State */}
      {recorderState === "stopped" && (
        <div className="space-y-3">
          {/* Audio Preview Bar (if recorded) */}
          {mediaUrl && (
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/30 border text-xs">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="flex items-center gap-2 text-primary font-medium hover:underline"
              >
                {isPlayingAudio ? (
                  <>
                    <Pause className="size-3.5" /> Pause Audio
                  </>
                ) : (
                  <>
                    <Play className="size-3.5" /> Playback Voice Preview
                  </>
                )}
              </button>
              <span className="text-muted-foreground font-mono text-[11px]">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          )}

          {/* Editable Transcript */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="voice-transcript" className="font-semibold text-foreground">
                Your transcript
              </label>
              <span className="text-[11px] text-muted-foreground">
                Edit any recognition mistakes below
              </span>
            </div>
            <Textarea
              id="voice-transcript"
              rows={3}
              value={editableTranscript}
              onChange={(e) => setEditableTranscript(e.target.value)}
              placeholder="Your spoken words will appear here. You can correct any misheard words..."
              className="text-xs resize-none leading-relaxed"
            />
          </div>

          {/* Transcript Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleStartRecording}
              className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" /> Record again
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-xs h-8"
              >
                Cancel
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={!editableTranscript.trim()}
                onClick={() => onTranscriptReady(editableTranscript.trim(), speech.language)}
                className="text-xs h-8 gap-1.5 px-4 font-medium"
              >
                <Check className="size-3.5" /> Use this transcript →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
