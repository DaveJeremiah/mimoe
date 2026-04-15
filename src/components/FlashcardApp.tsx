import { useState, useCallback, useMemo, useEffect } from "react";
import { Flashcard } from "./Flashcard";
import { WordBank } from "./WordBank";
import { LevelSelect } from "./LevelSelect";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { vocabularyLevels, phraseLevels, type FlashcardItem } from "@/lib/flashcardData";
import { PartyPopper, ArrowLeft } from "lucide-react";

type Tab = "vocabulary" | "phrases";

export function FlashcardApp() {
  const [activeTab, setActiveTab] = useLocalStorage<Tab>("mimoe-active-tab", "vocabulary");
  const [selectedLevelId, setSelectedLevelId] = useLocalStorage<string | null>("mimoe-selected-level", null);
  const [savedQueue, setSavedQueue] = useLocalStorage<string[]>("mimoe-saved-queue", []);

  const [completedVocab, setCompletedVocab] = useLocalStorage<string[]>("mimoe-completed-vocab", []);
  const [completedPhrases, setCompletedPhrases] = useLocalStorage<string[]>("mimoe-completed-phrases", []);

  const [customVocab, setCustomVocab] = useLocalStorage<Record<string, FlashcardItem[]>>("mimoe-custom-vocab", {});
  const [customPhrases, setCustomPhrases] = useLocalStorage<Record<string, FlashcardItem[]>>("mimoe-custom-phrases", {});

  const levels = activeTab === "vocabulary" ? vocabularyLevels : phraseLevels;
  const completedIds = activeTab === "vocabulary" ? completedVocab : completedPhrases;
  const setCompletedIds = activeTab === "vocabulary" ? setCompletedVocab : setCompletedPhrases;
  const customCards = activeTab === "vocabulary" ? customVocab : customPhrases;
  const setCustomCards = activeTab === "vocabulary" ? setCustomVocab : setCustomPhrases;

  const selectedLevel = useMemo(() => levels.find((l) => l.id === selectedLevelId) || null, [levels, selectedLevelId]);

  const allCards = useMemo(() => {
    if (!selectedLevel) return [];
    const custom = customCards[selectedLevel.id] || [];
    return [...selectedLevel.cards, ...custom];
  }, [selectedLevel, customCards]);

  const [queue, setQueue] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  // Restore progress on component mount
  useEffect(() => {
    if (selectedLevelId && savedQueue.length > 0 && !isRestoring) {
      setIsRestoring(true);
      // Validate that the saved queue still matches the current level
      const level = levels.find((l) => l.id === selectedLevelId);
      if (level) {
        const custom = customCards[selectedLevelId] || [];
        const allValidIds = [...level.cards, ...custom].map((c) => c.id);
        const validQueue = savedQueue.filter(id => allValidIds.includes(id));
        // Use setTimeout to prevent rapid state changes
        setTimeout(() => {
          setQueue(validQueue);
          setIsRestoring(false);
        }, 100);
      } else {
        setIsRestoring(false);
      }
    }
  }, [selectedLevelId, savedQueue, levels, customCards, isRestoring]);

  // Save queue state whenever it changes
  useEffect(() => {
    if (queue.length > 0) {
      setSavedQueue(queue);
    } else if (queue.length === 0 && savedQueue.length > 0) {
      // Clear saved queue when current queue is empty (level completed)
      setSavedQueue([]);
    }
  }, [queue, savedQueue, setSavedQueue]);

  const startLevel = useCallback((levelId: string) => {
    const level = levels.find((l) => l.id === levelId);
    if (!level) return;
    const custom = customCards[level.id] || [];
    const allIds = [...level.cards, ...custom].map((c) => c.id);
    setQueue(allIds);
    setSelectedLevelId(levelId);
  }, [levels, customCards]);

  const currentCard = useMemo(() => {
    if (queue.length === 0) return null;
    return allCards.find((i) => i.id === queue[0]) || null;
  }, [queue, allCards]);

  const handleCorrect = useCallback(() => {
    if (isRestoring) return; // Prevent advancement during restoration
    setQueue((q) => q.slice(1));
  }, [isRestoring]);

  const handleIncorrect = useCallback(() => {
    if (isRestoring) return; // Prevent advancement during restoration
    setQueue((q) => [...q.slice(1), q[0]]);
  }, [isRestoring]);

  const isDeckComplete = queue.length === 0 && selectedLevelId !== null;

  // Mark level complete when deck finishes
  const markComplete = useCallback(() => {
    if (selectedLevelId && !completedIds.includes(selectedLevelId)) {
      setCompletedIds((prev) => [...prev, selectedLevelId]);
    }
  }, [selectedLevelId, completedIds, setCompletedIds]);

  if (isDeckComplete && selectedLevelId && !completedIds.includes(selectedLevelId)) {
    markComplete();
  }

  const resetDeck = useCallback(() => {
    if (!selectedLevelId) return;
    startLevel(selectedLevelId);
  }, [selectedLevelId, startLevel]);

  const currentLevelIndex = levels.findIndex((l) => l.id === selectedLevelId);
  const nextLevel = currentLevelIndex >= 0 && currentLevelIndex < levels.length - 1
    ? levels[currentLevelIndex + 1]
    : null;

  const handleNextLevel = useCallback(() => {
    if (nextLevel) startLevel(nextLevel.id);
  }, [nextLevel, startLevel]);

  const handleBack = useCallback(() => {
    setSelectedLevelId(null);
    setQueue([]);
  }, []);

  const handleAddItem = useCallback(
    (english: string, french: string) => {
      if (!selectedLevelId) return;
      const id = `custom-${Date.now()}`;
      const newItem: FlashcardItem = { id, english, french };
      setCustomCards((prev) => ({
        ...prev,
        [selectedLevelId]: [...(prev[selectedLevelId] || []), newItem],
      }));
      setQueue((prev) => [...prev, id]);
    },
    [selectedLevelId, setCustomCards]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      if (!selectedLevelId) return;
      setCustomCards((prev) => ({
        ...prev,
        [selectedLevelId]: (prev[selectedLevelId] || []).filter((i) => i.id !== id),
      }));
      setQueue((prev) => prev.filter((i) => i !== id));
    },
    [selectedLevelId, setCustomCards]
  );

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedLevelId(null);
    setQueue([]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center max-w-[480px] mx-auto px-[15px] py-[61px]">
      {/* Header */}
      <header className="text-center mb-6 w-full">
        {selectedLevelId ? (
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-xl hover:bg-accent/50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="text-left">
              <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                {selectedLevel?.title}
              </h1>
              <p className="text-xs text-muted-foreground capitalize">{activeTab}</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
              Mimoe
            </h1>
            <p className="text-sm text-muted-foreground mt-1">French flashcard trainer</p>
          </>
        )}
      </header>

      {/* Tabs — only show on level select */}
      {!selectedLevelId && (
        <div className="flex w-full bg-muted rounded-2xl p-1 mb-6">
          {(["vocabulary", "phrases"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
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
      )}

      {/* Content */}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        {!selectedLevelId ? (
          <LevelSelect
            levels={levels}
            completedLevelIds={completedIds}
            onSelectLevel={startLevel}
          />
        ) : isDeckComplete ? (
          <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
            <PartyPopper className="w-16 h-16 text-secondary" />
            <h2 className="font-display text-2xl font-bold text-foreground">
              Bien joué! 🎉
            </h2>
            <p className="text-muted-foreground">
              You've mastered this level!
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={resetDeck}
                className="px-5 py-3 rounded-xl bg-card border border-border text-foreground font-semibold hover:bg-accent/50 transition-colors"
              >
                Practice again
              </button>
              {nextLevel && (
                <button
                  onClick={handleNextLevel}
                  className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                >
                  Next Level
                </button>
              )}
            </div>
          </div>
        ) : currentCard ? (
          <Flashcard
            key={currentCard.id}
            card={currentCard}
            onCorrect={handleCorrect}
            onIncorrect={handleIncorrect}
            total={allCards.length}
            remaining={queue.length}
          />
        ) : null}
      </div>

      {/* Word bank — only in active session */}
      {selectedLevelId && !isDeckComplete && (
        <div className="mt-6 w-full flex justify-center">
          <WordBank
            items={allCards}
            onAdd={handleAddItem}
            onDelete={handleDeleteItem}
            label={activeTab === "vocabulary" ? "Vocabulary" : "Phrases"}
          />
        </div>
      )}
    </div>
  );
}
