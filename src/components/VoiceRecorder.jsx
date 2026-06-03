import { useEffect, useRef, useState } from "react";
import api from "../services/api";

export default function VoiceRecorder({ transactionId, onUploaded }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioUrl]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsRecording(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(url);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Microphone access error:", error);
      alert("Microphone permission denied or unavailable");
    }
  };

  const uploadRecording = async () => {
    if (!audioBlob || !transactionId) {
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("voiceNote", audioBlob, `voice-note-${Date.now()}.webm`);

      const res = await api.put(`/transactions/${transactionId}/voice`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Voice note uploaded successfully");

      if (onUploaded) {
        onUploaded(res.data.transaction);
      }
    } catch (error) {
      console.error("Voice upload error:", error);
      alert(error.response?.data?.message || error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl("");
    setSeconds(0);
  };

  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {!isRecording ? (
          <button type="button" onClick={startRecording}>
            Start Recording
          </button>
        ) : (
          <button type="button" onClick={stopRecording}>
            Stop Recording ({seconds}s)
          </button>
        )}

        <button
          type="button"
          onClick={uploadRecording}
          disabled={!audioBlob || isRecording || isUploading}
        >
          {isUploading ? "Uploading..." : "Upload Voice Note"}
        </button>

        <button
          type="button"
          onClick={resetRecording}
          disabled={isRecording || !audioBlob}
        >
          Reset
        </button>
      </div>

      {audioUrl && (
        <div style={{ marginTop: "12px" }}>
          <audio controls src={audioUrl} />
        </div>
      )}
    </div>
  );
}