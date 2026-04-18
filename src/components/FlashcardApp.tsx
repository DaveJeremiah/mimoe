import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Flashcard } from "./Flashcard";
import { WordBank } from "./WordBank";
import { LevelSelect } from "./LevelSelect";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { vocabularyLevels, phraseLevels, type FlashcardItem, type Level } from "@/lib/flashcardData";
import { prefetchAudio, unlockAudio } from "@/lib/speechUtils";
import { useContinuousMic } from "@/hooks/useContinuousMic";
import { PartyPopper, ArrowLeft, Plus, LogOut } from "lucide-react";

type Tab = "vocabulary" | "phrases";

export function FlashcardApp() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useLocalStorage<Tab>("mimoe-active-tab", "vocabulary");
  const [selectedLevelId, setSelectedLevelId] = useLocalStorage<string | null>("mimoe-selected-level", null);
  const [savedQueue, setSavedQueue] = useLocalStorage<string[]>("mimoe-saved-queue", []);

  const [customVocabLevels, setCustomVocabLevels] = useLocalStorage<Level[]>("mimoe-custom-vocab-levels", []);
  const [customPhraseLevels, setCustomPhraseLevels] = useLocalStorage<Level[]>("mimoe-custom-phrase-levels", []);

  const [completedVocab, setCompletedVocab] = useLocalStorage<string[]>("mimoe-completed-vocab", []);
  const [completedPhrases, setCompletedPhrases] = useLocalStorage<string[]>("mimoe-completed-phrases", []);

  const [customVocab, setCustomVocab] = useLocalStorage<Record<string, FlashcardItem[]>>("mimoe-custom-vocab", {});
  const [customPhrases, setCustomPhrases] = useLocalStorage<Record<string, FlashcardItem[]>>("mimoe-custom-phrases", {});

  // Track which cards were answered correctly on FIRST attempt in current session
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState<Set<string>>(new Set());
  const [failedCards, setFailedCards] = useState<Set<string>>(new Set());

  const levels = useMemo(() => {
    const defaultLevels = activeTab === "vocabulary" ? vocabularyLevels : phraseLevels;
    const customLevels = activeTab === "vocabulary" ? customVocabLevels : customPhraseLevels;
    return [...defaultLevels, ...customLevels];
  }, [activeTab, customVocabLevels, customPhraseLevels]);

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

  // Persistent mic across cards/sessions
  const onTranscriptRef = useRef<(text: string, isFinal: boolean) => void>(() => {});
  const { status: micStatus, start: startMic, stop: stopMic } = useContinuousMic({
    onTranscript: useCallback((text: string, isFinal: boolean) => {
      onTranscriptRef.current(text, isFinal);
    }, []),
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Load progress from DB on mount
  useEffect(() => {
    if (!user) return;
    const loadProgress = async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("level_id, tab, all_correct")
        .eq("user_id", user.id);
      if (data) {
        const vocab: string[] = [];
        const phrases: string[] = [];
        data.forEach((row) => {
          if (row.all_correct) {
            if (row.tab === "vocabulary") vocab.push(row.level_id);
            else if (row.tab === "phrases") phrases.push(row.level_id);
          }
        });
        setCompletedVocab(vocab);
        setCompletedPhrases(phrases);
      }
    };
    loadProgress();
  }, [user]);

  // Restore progress on component mount
  useEffect(() => {
    if (selectedLevelId && savedQueue.length > 0) {
      const level = levels.find((l) => l.id === selectedLevelId);
      if (level) {
        const custom = customCards[selectedLevelId] || [];
        const allValidIds = [...level.cards, ...custom].map((c) => c.id);
        const validQueue = savedQueue.filter(id => allValidIds.includes(id));
        if (validQueue.length > 0 && queue.length === 0) {
          setQueue(validQueue);
        }
      }
    }
  }, [selectedLevelId, savedQueue, levels, customCards, queue.length]);

  // Save queue state whenever it changes
  useEffect(() => {
    if (queue.length > 0) {
      setSavedQueue(queue);
    } else if (queue.length === 0 && savedQueue.length > 0) {
      setSavedQueue([]);
    }
  }, [queue, savedQueue, setSavedQueue]);

  const startLevel = useCallback((levelId: string) => {
    const level = levels.find((l) => l.id === levelId);
    if (!level) return;
    unlockAudio();
    const custom = customCards[level.id] || [];
    const allItems = [...level.cards, ...custom];
    const allIds = allItems.map((c) => c.id);
    setQueue(allIds);
    setSelectedLevelId(levelId);
    setFirstAttemptCorrect(new Set());
    setFailedCards(new Set());
    // Pre-warm TTS cache for first 3 cards
    prefetchAudio(allItems.slice(0, 3).map((c) => c.french));
  }, [levels, customCards]);

  const currentCard = useMemo(() => {
    if (queue.length === 0) return null;
    return allCards.find((i) => i.id === queue[0]) || null;
  }, [queue, allCards]);

  // Manage Mic state according to card visibility
  useEffect(() => {
    if (currentCard && micStatus === "idle") {
      unlockAudio();
      startMic();
    } else if (!currentCard && micStatus !== "idle" && micStatus !== "unsupported" && micStatus !== "denied") {
      stopMic();
    }
  }, [currentCard?.id, micStatus, startMic, stopMic]);

  const handleAdvance = useCallback(({ failed, requeue }: { failed: boolean; requeue: boolean }) => {
    const cardId = queue[0];
    if (!cardId) return;
    if (failed) {
      setFailedCards(prev => new Set(prev).add(cardId));
    } else {
      setFirstAttemptCorrect(prev => new Set(prev).add(cardId));
    }
    if (requeue) {
      setQueue((q) => [...q.slice(1), q[0]]);
    } else {
      setQueue((q) => q.slice(1));
    }
  }, [queue]);

  const isDeckComplete = queue.length === 0 && selectedLevelId !== null;

  // Save completion to DB when deck finishes
  const saveCompletion = useCallback(async (levelId: string, tab: string, allCorrect: boolean) => {
    if (!user) return;
    await supabase
      .from("user_progress")
      .upsert({
        user_id: user.id,
        level_id: levelId,
        tab,
        all_correct: allCorrect,
      }, { onConflict: "user_id,level_id,tab" });
  }, [user]);

  // Check completion when deck finishes
  useEffect(() => {
    if (isDeckComplete && selectedLevelId) {
      const allCorrectFirstTry = allCards.length > 0 && failedCards.size === 0;
      
      if (allCorrectFirstTry && !completedIds.includes(selectedLevelId)) {
        setCompletedIds((prev) => [...prev, selectedLevelId]);
      }
      
      saveCompletion(selectedLevelId, activeTab, allCorrectFirstTry);
    }
  }, [isDeckComplete, selectedLevelId]);

  const allCorrectThisSession = allCards.length > 0 && failedCards.size === 0;

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
    setFirstAttemptCorrect(new Set());
    setFailedCards(new Set());
  }, []);

  const handleAddItem = useCallback(
    (english: string, french: string, alternatives?: string[]) => {
      if (!selectedLevelId) return;
      const id = `custom-${Date.now()}`;
      const newItem: FlashcardItem = { id, english, french, ...(alternatives && alternatives.length > 0 ? { alternatives } : {}) };
      setCustomCards((prev) => ({
        ...prev,
        [selectedLevelId]: [...(prev[selectedLevelId] || []), newItem],
      }));
      setQueue((prev) => [...prev, id]);
    },
    [selectedLevelId, setCustomCards]
  );

  const handleUpdateItem = useCallback(
    (id: string, english: string, french: string, alternatives?: string[]) => {
      if (!selectedLevelId) return;
      setCustomCards((prev) => ({
        ...prev,
        [selectedLevelId]: (prev[selectedLevelId] || []).map((i) =>
          i.id === id ? { ...i, english, french, alternatives: alternatives || [] } : i
        ),
      }));
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

  const handleBulkAdd = useCallback(
    (entries: { english: string; french: string; alternatives?: string[] }[]) => {
      if (!selectedLevelId) return;
      const newItems = entries.map((entry) => {
        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return { id, ...entry };
      });
      setCustomCards((prev) => ({
        ...prev,
        [selectedLevelId]: [...(prev[selectedLevelId] || []), ...newItems],
      }));
      setQueue((prev) => [...prev, ...newItems.map((item) => item.id)]);
    },
    [selectedLevelId, setCustomCards]
  );

  const handleAddLevel = useCallback(() => {
    const title = window.prompt("Enter new level name:");
    if (title && title.trim()) {
      const newLevel: Level = { id: `custom-level-${Date.now()}`, title: title.trim(), cards: [] };
      if (activeTab === "vocabulary") {
        setCustomVocabLevels(prev => [...prev, newLevel]);
      } else {
        setCustomPhraseLevels(prev => [...prev, newLevel]);
      }
    }
  }, [activeTab, setCustomVocabLevels, setCustomPhraseLevels]);

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedLevelId(null);
    setQueue([]);
    setFirstAttemptCorrect(new Set());
    setFailedCards(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Mimoe</h1>
              <p className="text-sm text-muted-foreground mt-1">French flashcard trainer</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-xl hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      {/* Tabs */}
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
            onAddLevel={handleAddLevel}
          />
        ) : isDeckComplete ? (
          <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
            <PartyPopper className="w-16 h-16 text-secondary" />
            <h2 className="font-display text-2xl font-bold text-foreground">
              {allCorrectThisSession ? "Perfect! 🎉" : "Level finished!"}
            </h2>
            <p className="text-muted-foreground">
              {allCorrectThisSession
                ? "You got every card right on the first try!"
                : `You missed ${failedCards.size} card${failedCards.size !== 1 ? "s" : ""}. Try again for a perfect score!`}
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
            onAdvance={handleAdvance}
            total={allCards.length}
            remaining={queue.length}
            onTranscriptRef={onTranscriptRef}
          />
        ) : null}
      </div>

      {/* Word bank */}
      {selectedLevelId && !isDeckComplete && (
        <div className="mt-6 w-full flex justify-center">
          <WordBank
            items={allCards}
            onAdd={handleAddItem}
            onUpdate={handleUpdateItem}
            onDelete={handleDeleteItem}
            onBulkAdd={handleBulkAdd}
            label={activeTab === "vocabulary" ? "Vocabulary" : "Phrases"}
          />
        </div>
      )}

    </div>
  );
}
