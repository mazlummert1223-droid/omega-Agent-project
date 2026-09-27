import { useCallback, useEffect, useRef, useState } from "react";

export type OmegaVoiceStatus = "idle" | "recording" | "transcribing" | "speaking";
export type OmegaVoiceController = ReturnType<typeof useOmegaVoice>;

function chooseMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "audio/webm";
}

function extensionForMime(type: string): string {
  if (type.includes("mp4") || type.includes("aac")) return "mp4";
  if (type.includes("mpeg")) return "mp3";
  if (type.includes("wav")) return "wav";
  return "webm";
}

export function useOmegaVoice() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem("omega-voice-enabled") === "true";
    } catch {
      return false;
    }
  });
  const [status, setStatus] = useState<OmegaVoiceStatus>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setStatus(current => current === "speaking" ? "idle" : current);
  }, []);

  const setVoiceEnabled = useCallback((next: boolean) => {
    setEnabled(next);
    try {
      localStorage.setItem("omega-voice-enabled", String(next));
    } catch {}
    if (!next) stopSpeaking();
  }, [stopSpeaking]);

  const startRecording = useCallback(async () => {
    if (!supported || status === "recording") return;
    stopSpeaking();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = chooseMimeType();
    const recorder = new MediaRecorder(stream, { mimeType });
    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.start(100);
    setStatus("recording");
  }, [status, stopSpeaking, supported]);

  const stopRecordingAndTranscribe = useCallback(async (): Promise<string> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return "";

    const blob = await new Promise<Blob>(resolve => {
      recorder.onstop = () => {
        const result = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        resolve(result);
      };
      recorder.stop();
    });

    setStatus("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, `omega-voice.${extensionForMime(blob.type)}`);
      const response = await fetch("/api/openai/voice/transcribe", {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error("transcription failed");
      const data = await response.json() as { transcript?: string };
      return data.transcript?.trim() || "";
    } finally {
      setStatus("idle");
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!enabled || !text.trim()) return;
    stopSpeaking();
    setStatus("speaking");
    try {
      const response = await fetch("/api/openai/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("speech synthesis failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (audioUrlRef.current === url) {
          URL.revokeObjectURL(url);
          audioUrlRef.current = null;
        }
        audioRef.current = null;
        setStatus("idle");
      };
      await audio.play();
    } catch {
      stopSpeaking();
    }
  }, [enabled, stopSpeaking]);

  useEffect(() => () => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    stopSpeaking();
  }, [stopSpeaking]);

  return {
    enabled,
    setVoiceEnabled,
    status,
    supported,
    startRecording,
    stopRecordingAndTranscribe,
    speak,
    stopSpeaking,
  };
}