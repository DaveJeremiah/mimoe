import { useState, useCallback, useMemo } from "react";
import { Flashcard } from "./Flashcard";
import { WordBank } from "./WordBank";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { defaultVocabulary, defaultPhrases, type FlashcardItem } from "@/lib/flashcardData";
import { PartyPopper } from "lucide-react";

type Tab = "vocabulary" | "phrases";

export function FlashcardApp() {
  const [activeTab, setActiveTab] = useState<Tab>("vocabulary");

  const [vocabBank, setVocabBank] = useLocalStorage<FlashcardItem[]>("mimoe-vocab", defaultVocabulary);
  const [phraseBank, setPhraseBank] = useLocalStorage<FlashcardItem[]>("mimoe-phrases", defaultPhrases);

  const [vocabQueue, setVocabQueue] = useState<string[]>(() => defaultVocabulary.map((i) => i.id));
  const [phraseQueue, setPhraseQueue] = useState<string[]>(() => defaultPhrases.map((i) => i.id));

  const bank = activeTab === "vocabulary" ? vocabBank : phraseBank;
  const setBank = activeTab === "vocabulary" ? setVocabBank : setPhraseBank;
  const queue = activeTab === "vocabulary" ? vocabQueue : phraseQueue;
  const setQueue = activeTab === "vocabulary" ? setVocabQueue : setPhraseQueue;

  const currentCard = useMemo(() => {
    if (queue.length === 0) return null;
    return bank.find((i) => i.id === queue[0]) || null;
  }, [queue, bank]);

  const handleCorrect = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, [setQueue]);

  const handleIncorrect = useCallback(() => {
    setQueue((q) => [...q.slice(1), q[0]]);
  }, [setQueue]);

  const handleAddItem = useCallback(
    (english: string, french: string) => {
      const id = `custom-${Date.now()}`;
      const newItem: FlashcardItem = { id, english, french };
      setBank((prev) => [...prev, newItem]);
      setQueue((prev) => [...prev, id]);
    },
    [setBank, setQueue]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      setBank((prev) => prev.filter((i) => i.id !== id));
      setQueue((prev) => prev.filter((i) => i !== id));
    },
    [setBank, setQueue]
  );

  const resetDeck = useCallback(() => {
    setQueue(bank.map((i) => i.id));
  }, [bank, setQueue]);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 max-w-[480px] mx-auto">
      {/* Header */}
      <header className="text-center mb-6 w-full">
        <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
          Mimoe
        </h1>
        <p className="text-sm text-muted-foreground mt-1">French flashcard trainer</p>
      </header>

      {/* Tabs */}
      <div className="flex w-full bg-muted rounded-2xl p-1 mb-6">
        {(["vocabulary", "phrases"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${
              activeTab === tab
                ? "bg-card card-shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Card area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        {currentCard ? (
          <Flashcard
            key={currentCard.id}
            card={currentCard}
            onCorrect={handleCorrect}
            onIncorrect={handleIncorrect}
            total={bank.length}
            remaining={queue.length}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
            <PartyPopper className="w-16 h-16 text-secondary" />
            <h2 className="font-display text-2xl font-bold text-foreground">
              Bien joué! 🎉
            </h2>
            <p className="text-muted-foreground">
              You've mastered this deck!
            </p>
            <button
              onClick={resetDeck}
              className="mt-4 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Practice again
            </button>
          </div>
        )}
      </div>

      {/* Word bank trigger */}
      <div className="mt-6 w-full flex justify-center">
        <WordBank
          items={bank}
          onAdd={handleAddItem}
          onDelete={handleDeleteItem}
          label={activeTab === "vocabulary" ? "Vocabulary" : "Phrases"}
        />
      </div>
    </div>
  );
}
