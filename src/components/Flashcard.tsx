import { useState, useRef, useEffect } from "react";
import { MicButton } from "./MicButton";
import { isMatch, speakFrench } from "@/lib/speechUtils";
import type { FlashcardItem } from "@/lib/flashcardData";
import { Check, X, Send } from "lucide-react";

interface FlashcardProps {
  card: FlashcardItem;
  onCorrect: () => void;
  onIncorrect: () => void;
  total: number;
  remaining: number;
}

type CardState = "prompt" | "correct" | "incorrect";

export function Flashcard({ card, onCorrect, onIncorrect, total, remaining }: FlashcardProps) {
  const [state, setState] = useState<CardState>("prompt");
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [animatingOut, setAnimatingOut] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Reset state when card changes
  useEffect(() => {
    setState("prompt");
    setTextInput("");
    setSpokenText("");
    setIsListening(false);
    setAnimatingOut(false);
  }, [card.id]);

  const handleResult = (answer: string) => {
    if (isMatch(answer, card.french)) {
      setState("correct");
      setTimeout(() => {
        setAnimatingOut(true);
        setTimeout(onCorrect, 500);
      }, 800);
    } else {
      setState("incorrect");
      speakFrench(card.french);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Please type your answer.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const results = event.results[0];
      let matched = false;
      for (let i = 0; i < results.length; i++) {
        const transcript = results[i].transcript;
        if (isMatch(transcript, card.french)) {
          setSpokenText(transcript);
          matched = true;
          break;
        }
      }
      if (!matched) {
        setSpokenText(results[0].transcript);
      }
      handleResult(matched ? card.french : results[0].transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setSpokenText(textInput.trim());
    handleResult(textInput.trim());
  };

  const handleSelfAssess = (correct: boolean) => {
    if (correct) {
      setAnimatingOut(true);
      setTimeout(onCorrect, 500);
    } else {
      onIncorrect();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-card-enter">
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">{remaining}</span>
        <span>/</span>
        <span>{total}</span>
        <span>cards remaining</span>
      </div>

      {/* Card */}
      <div
        className={`relative w-full max-w-sm aspect-[3/4] rounded-2xl card-shadow-lg transition-all duration-500 ${
          animatingOut ? "animate-card-flip-out" : ""
        }`}
        style={{ perspective: "1000px" }}
      >
        <div
          className={`w-full h-full rounded-2xl overflow-hidden transition-transform duration-500 ${
            state === "incorrect" ? "[transform:rotateY(180deg)]" : ""
          }`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl bg-card flex flex-col items-center justify-center p-8 border border-border"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(0deg)" }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Translate to French
            </span>
            <h2 className="font-display text-3xl font-bold text-foreground text-center leading-snug">
              {card.english}
            </h2>
            {state === "correct" && (
              <div className="mt-6 flex items-center gap-2 text-success animate-fade-in">
                <Check className="w-6 h-6" />
                <span className="font-semibold text-lg">Correct!</span>
              </div>
            )}
            {spokenText && state === "prompt" && (
              <p className="mt-4 text-sm text-muted-foreground italic">"{spokenText}"</p>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl bg-primary flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60 mb-4">
              Answer
            </span>
            <h2 className="font-display text-3xl font-bold text-primary-foreground text-center leading-snug">
              {card.french}
            </h2>
            {spokenText && (
              <p className="mt-4 text-sm text-primary-foreground/60 italic">
                You said: "{spokenText}"
              </p>
            )}
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => handleSelfAssess(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-success text-success-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <Check className="w-4 h-4" /> I knew it
              </button>
              <button
                onClick={() => handleSelfAssess(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <X className="w-4 h-4" /> Try again
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      {state === "prompt" && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm animate-fade-in">
          <MicButton isListening={isListening} onClick={toggleMic} />
          <span className="text-xs text-muted-foreground">
            {isListening ? "Listening..." : "Tap to speak"}
          </span>
          <form onSubmit={handleTextSubmit} className="flex w-full gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type in French..."
              className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-3 text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
