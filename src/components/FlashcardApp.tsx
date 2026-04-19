import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Flashcard } from "./Flashcard";
import { WordBank } from "./WordBank";
import { LevelSelect } from "./LevelSelect";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { PersonalSpaceDivider } from "./PersonalSpaceDivider";
import { CollectionCard } from "./CollectionCard";
import { NewCollectionModal } from "./NewCollectionModal";
import { NewLevelModal } from "./NewLevelModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { vocabularyLevels, phraseLevels, type FlashcardItem } from "@/lib/flashcardData";
import { type Collection, CollectionFormData } from "@/lib/collectionTypes";
import { prefetchAudio, unlockAudio } from "@/lib/speechUtils";
import { useContinuousMic } from "@/hooks/useContinuousMic";
import { PartyPopper, ArrowLeft, Plus, LogOut, MoreVertical, Shuffle, Bookmark, Home, User, ChevronLeft, ChevronRight, Mic, Activity } from "lucide-react";

type Tab = "vocabulary" | "phrases";
type AppView = "main" | "collection";

export function FlashcardApp() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useLocalStorage<Tab>("mimoe-active-tab", "vocabulary");
  const [selectedLevelId, setSelectedLevelId] = useLocalStorage<string | null>("mimoe-selected-level", null);
  const [savedQueue, setSavedQueue] = useLocalStorage<string[]>("mimoe-saved-queue", []);

  const [completedVocab, setCompletedVocab] = useLocalStorage<string[]>("mimoe-completed-vocab", []);
  const [completedPhrases, setCompletedPhrases] = useLocalStorage<string[]>("mimoe-completed-phrases", []);

  // Personal Space state
  const [appView, setAppView] = useState<AppView>("main");
  const [collections, setCollections] = useLocalStorage<Collection[]>("mimoe-collections", []);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | undefined>();
  const [collectionQueue, setCollectionQueue] = useState<string[]>([]);

  const [customVocab, setCustomVocab] = useLocalStorage<Record<string, FlashcardItem[]>>("mimoe-custom-vocab", {});
  const [customPhrases, setCustomPhrases] = useLocalStorage<Record<string, FlashcardItem[]>>("mimoe-custom-phrases", {});

  // User-created levels (persisted per tab)
  const [customVocabLevels, setCustomVocabLevels] = useLocalStorage<{ id: string; title: string }[]>("mimoe-custom-levels-vocab", []);
  const [customPhraseLevels, setCustomPhraseLevels] = useLocalStorage<{ id: string; title: string }[]>("mimoe-custom-levels-phrases", []);
  const [isNewLevelModalOpen, setIsNewLevelModalOpen] = useState(false);

  // Track which cards were answered correctly on FIRST attempt in current session
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState<Set<string>>(new Set());
  const [failedCards, setFailedCards] = useState<Set<string>>(new Set());
  const [bookmarkedCards, setBookmarkedCards] = useLocalStorage<string[]>("mimoe-bookmarked-cards", []);

  // Special "bookmarked" study session — synthetic level
  const [isBookmarkedSession, setIsBookmarkedSession] = useState(false);

  const [customOrder, setCustomOrder] = useLocalStorage<Record<string, string[]>>("mimoe-custom-order", {});
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const baseLevels = activeTab === "vocabulary" ? vocabularyLevels : phraseLevels;
  const completedIds = activeTab === "vocabulary" ? completedVocab : completedPhrases;
  const setCompletedIds = activeTab === "vocabulary" ? setCompletedVocab : setCompletedPhrases;
  const customCards = activeTab === "vocabulary" ? customVocab : customPhrases;
  const setCustomCards = activeTab === "vocabulary" ? setCustomVocab : setCustomPhrases;
  const customLevelsList = activeTab === "vocabulary" ? customVocabLevels : customPhraseLevels;
  const setCustomLevelsList = activeTab === "vocabulary" ? setCustomVocabLevels : setCustomPhraseLevels;

  // Merge built-in levels with user-created custom levels
  const levels = useMemo(() => {
    const customAsLevels = customLevelsList.map((cl) => ({
      id: cl.id,
      title: cl.title,
      cards: customCards[cl.id] || [],
    }));
    return [...baseLevels, ...customAsLevels];
  }, [baseLevels, customLevelsList, customCards]);

  // Build a synthetic "bookmarked" level pulling cards from every level (current tab)
  const bookmarkedLevel = useMemo(() => {
    if (bookmarkedCards.length === 0) return null;
    const allItems: FlashcardItem[] = [];
    for (const lvl of levels) {
      const custom = customCards[lvl.id] || [];
      const customDict = Object.fromEntries(custom.map((c) => [c.id, c]));
      const merged = [
        ...lvl.cards.map((c) => customDict[c.id] || c),
        ...custom.filter((c) => !lvl.cards.some((sc) => sc.id === c.id)),
      ];
      for (const card of merged) {
        if (bookmarkedCards.includes(card.id) && !allItems.some((a) => a.id === card.id)) {
          allItems.push(card);
        }
      }
    }
    if (allItems.length === 0) return null;
    return { id: "__bookmarked__", title: "Favorites", cards: allItems };
  }, [bookmarkedCards, levels, customCards]);

  // selectedLevel resolves to a normal level OR the synthetic bookmarked one
  const selectedLevel = useMemo(() => {
    if (isBookmarkedSession) return bookmarkedLevel;
    return levels.find((l) => l.id === selectedLevelId) || null;
  }, [isBookmarkedSession, bookmarkedLevel, levels, selectedLevelId]);

  const allCards = useMemo(() => {
    if (!selectedLevel) return [];
    if (isBookmarkedSession) return selectedLevel.cards;
    const custom = customCards[selectedLevel.id] || [];

    // Merge base cards with custom overrides
    const customDict = Object.fromEntries(custom.map(c => [c.id, c]));
    const baseCards = selectedLevel.cards.map(c => customDict[c.id] || c);
    const addedCustom = custom.filter(c => !selectedLevel.cards.some(sc => sc.id === c.id));
    const merged = [...baseCards, ...addedCustom];

    // Apply custom order if present
    const order = customOrder[selectedLevel.id];
    if (order && order.length > 0) {
      const sorted = [];
      const mergedDict = Object.fromEntries(merged.map(c => [c.id, c]));
      for (const id of order) {
        if (mergedDict[id]) {
          sorted.push(mergedDict[id]);
          delete mergedDict[id];
        }
      }
      return [...sorted, ...Object.values(mergedDict)];
    }
    return merged;
  }, [selectedLevel, isBookmarkedSession, customCards, customOrder]);

  const [queue, setQueue] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]); // Track completed cards for undo
  const [collectionHistory, setCollectionHistory] = useState<string[]>([]); // Track collection cards for undo

  // Persistent mic across cards/sessions
  const onTranscriptRef = useRef<(text: string, isFinal: boolean) => void>(() => {});
  const { status: micStatus, start: startMic, stop: stopMic } = useContinuousMic({
    onTranscript: useCallback((text: string, isFinal: boolean) => {
      onTranscriptRef.current(text, isFinal);
    }, []),
  });

  const animateAdvanceRef = useRef<((exitClass: string, opts: { failed: boolean; requeue: boolean }) => void) | null>(null);

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
    setIsBookmarkedSession(false);
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

  const startBookmarkedSession = useCallback(() => {
    if (!bookmarkedLevel || bookmarkedLevel.cards.length === 0) return;
    unlockAudio();
    setIsBookmarkedSession(true);
    setSelectedLevelId(bookmarkedLevel.id);
    setQueue(bookmarkedLevel.cards.map((c) => c.id));
    setFirstAttemptCorrect(new Set());
    setFailedCards(new Set());
    prefetchAudio(bookmarkedLevel.cards.slice(0, 3).map((c) => c.french));
  }, [bookmarkedLevel]);

  const handleAddLevel = useCallback((title: string) => {
    const newId = `custom-level-${Date.now()}`;
    setCustomLevelsList((prev) => [...prev, { id: newId, title }]);
  }, [setCustomLevelsList]);

  const currentCard = useMemo(() => {
    if (queue.length === 0) return null;
    return allCards.find((i) => i.id === queue[0]) || null;
  }, [queue, allCards]);

  const collectionCards = useMemo(() => {
    if (!selectedCollection) return [];
    return selectedCollection.entries.map((entry, index) => ({
      id: `collection-${selectedCollection.id}-${index}`,
      english: entry.english,
      french: entry.french
    }));
  }, [selectedCollection]);

  const currentCollectionCard = useMemo(() => {
    if (collectionQueue.length === 0 || !selectedCollection) return null;
    const firstQueueId = collectionQueue[0];
    const index = parseInt(firstQueueId.split('-').pop() || '0');
    return collectionCards[index] || null;
  }, [collectionQueue, collectionCards, selectedCollection]);

  // Start mic once when first card appears, stop it if not on a card
  useEffect(() => {
    const activeCard = currentCard || currentCollectionCard;
    const shouldListen = activeCard && isMicEnabled && isVisible;

    if (shouldListen && micStatus === "idle") {
      unlockAudio();
      startMic();
    } else if (!shouldListen && micStatus !== "idle") {
      stopMic();
    }
  }, [currentCard?.id, currentCollectionCard?.id, isVisible, isMicEnabled, micStatus, startMic, stopMic]);

  const handleAdvance = useCallback(({ failed, requeue }: { failed: boolean; requeue: boolean }) => {
    const cardId = queue[0];
    if (!cardId) return;
    if (failed) {
      setFailedCards(prev => new Set(prev).add(cardId));
    } else {
      setFirstAttemptCorrect(prev => new Set(prev).add(cardId));
    }
    // Add to history unless requeuing
    if (!requeue) {
      setHistory(prev => [...prev, cardId]);
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

  // Check completion when deck finishes (skip DB save for synthetic bookmarked session)
  useEffect(() => {
    if (isDeckComplete && selectedLevelId && !isBookmarkedSession) {
      const allCorrectFirstTry = allCards.length > 0 && failedCards.size === 0;

      if (allCorrectFirstTry && !completedIds.includes(selectedLevelId)) {
        setCompletedIds((prev) => [...prev, selectedLevelId]);
      }

      saveCompletion(selectedLevelId, activeTab, allCorrectFirstTry);
    }
  }, [isDeckComplete, selectedLevelId, isBookmarkedSession]);

  const allCorrectThisSession = allCards.length > 0 && failedCards.size === 0;

  const resetDeck = useCallback(() => {
    if (isBookmarkedSession) {
      startBookmarkedSession();
      return;
    }
    if (!selectedLevelId) return;
    startLevel(selectedLevelId);
  }, [isBookmarkedSession, selectedLevelId, startLevel, startBookmarkedSession]);

  const currentLevelIndex = levels.findIndex((l) => l.id === selectedLevelId);
  const nextLevel = !isBookmarkedSession && currentLevelIndex >= 0 && currentLevelIndex < levels.length - 1
    ? levels[currentLevelIndex + 1]
    : null;

  const handleNextLevel = useCallback(() => {
    if (nextLevel) startLevel(nextLevel.id);
  }, [nextLevel, startLevel]);

  const handleBack = useCallback(() => {
    setIsBookmarkedSession(false);
    setSelectedLevelId(null);
    setQueue([]);
    setFirstAttemptCorrect(new Set());
    setFailedCards(new Set());
  }, []);

  // Swipe handlers for regular cards
  const handleSwipeForward = useCallback(() => {
    if (queue.length === 0) return;
    const cardId = queue[0];
    // Count as correct and add to history
    setFirstAttemptCorrect(prev => new Set(prev).add(cardId));
    setHistory(prev => [...prev, cardId]);
    setQueue(prev => prev.slice(1));
  }, [queue]);

  const handleSwipeBackward = useCallback(() => {
    if (history.length === 0) return;
    const lastCardId = history[history.length - 1];
    // Remove from history and put back in queue
    setHistory(prev => prev.slice(0, -1));
    setQueue(prev => [lastCardId, ...prev]);
    // Remove from first attempt correct since we're undoing
    setFirstAttemptCorrect(prev => {
      const newSet = new Set(prev);
      newSet.delete(lastCardId);
      return newSet;
    });
  }, [history]);

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
      const updatedItem: FlashcardItem = { id, english, french, ...(alternatives && alternatives.length > 0 ? { alternatives } : {}) };
      setCustomCards((prev) => {
        const levelCards = prev[selectedLevelId] || [];
        const index = levelCards.findIndex((i) => i.id === id);
        if (index >= 0) {
          const newLevelCards = [...levelCards];
          newLevelCards[index] = updatedItem;
          return { ...prev, [selectedLevelId]: newLevelCards };
        } else {
          return { ...prev, [selectedLevelId]: [...levelCards, updatedItem] };
        }
      });
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

  const handleReorder = useCallback((newOrderIds: string[]) => {
    if (!selectedLevelId) return;
    setCustomOrder(prev => ({
      ...prev,
      [selectedLevelId]: newOrderIds
    }));
  }, [selectedLevelId, setCustomOrder]);

  const handleShuffleDeck = () => {
    if (!selectedLevelId) return;
    const shuffledIds = [...allCards].map(c => c.id).sort(() => Math.random() - 0.5);
    setQueue(shuffledIds);
    setSavedQueue(shuffledIds);
    setFirstAttemptCorrect(new Set());
    setFailedCards(new Set());
    setCustomOrder(prev => ({ ...prev, [selectedLevelId]: shuffledIds }));
    setIsMenuOpen(false);
  };

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedLevelId(null);
    setQueue([]);
    setFirstAttemptCorrect(new Set());
    setFailedCards(new Set());
  };

  // Collection management functions
  const handleCreateCollection = useCallback(() => {
    setEditingCollection(undefined);
    setIsCollectionModalOpen(true);
  }, []);

  const handleSaveCollection = useCallback((data: CollectionFormData) => {
    if (editingCollection) {
      setCollections(prev => prev.map(col => 
        col.id === editingCollection.id 
          ? { ...col, ...data, updatedAt: new Date().toISOString() }
          : col
      ));
    } else {
      const newCollection: Collection = {
        id: `collection-${Date.now()}`,
        title: data.title,
        entries: data.entries,
        createdAt: new Date().toISOString()
      };
      setCollections(prev => [...prev, newCollection]);
    }
  }, [editingCollection, setCollections]);

  const handleEditCollection = useCallback((collection: Collection) => {
    setEditingCollection(collection);
    setIsCollectionModalOpen(true);
  }, []);

  const handleDeleteCollection = useCallback((collectionId: string) => {
    setCollections(prev => prev.filter(col => col.id !== collectionId));
  }, [setCollections]);

  const handleStudyCollection = useCallback((collection: Collection) => {
    unlockAudio();
    setSelectedCollection(collection);
    const queueIds = collection.entries.map((_, index) => `collection-${collection.id}-${index}`);
    setCollectionQueue(queueIds);
    prefetchAudio(collection.entries.slice(0, 3).map((e) => e.french));
    setAppView("collection");
  }, []);

  const handleBackToMain = useCallback(() => {
    setAppView("main");
    setSelectedCollection(null);
    setCollectionQueue([]);
  }, []);

  // Swipe handlers for collection cards
  const handleCollectionSwipeForward = useCallback(() => {
    if (collectionQueue.length === 0) return;
    // Count as correct and add to history
    setCollectionHistory(prev => [...prev, collectionQueue[0]]);
    setCollectionQueue(prev => prev.slice(1));
  }, [collectionQueue]);

  const handleCollectionSwipeBackward = useCallback(() => {
    if (collectionHistory.length === 0) return;
    const lastCardId = collectionHistory[collectionHistory.length - 1];
    // Remove from history and put back in queue
    setCollectionHistory(prev => prev.slice(0, -1));
    setCollectionQueue(prev => [lastCardId, ...prev]);
  }, [collectionHistory]);

  const handleCollectionAdvance = useCallback(({ requeue }: { failed: boolean; requeue: boolean }) => {
    if (requeue) {
      setCollectionQueue(q => [...q.slice(1), q[0]]);
    } else {
      setCollectionQueue(q => q.slice(1));
    }
  }, []);

  const isCollectionDeckComplete = collectionQueue.length === 0 && selectedCollection !== null;

  // Add these handlers in FlashcardApp
  const [touchStart, setTouchStart] = useState<{x: number; y: number} | null>(null);

  const handleSessionTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleSessionTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const dx = touchStart.x - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStart.y - e.changedTouches[0].clientY);
    // Only register horizontal swipes (ignore scrolling)
    if (Math.abs(dx) < 60 || dy > 80) return;
    if (dx > 0) {
      // Swipe left = forward
      handleSwipeForward();
    } else {
      // Swipe right = backward
      handleSwipeBackward();
    }
    setTouchStart(null);
  };

  const handleCollectionSessionTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const dx = touchStart.x - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStart.y - e.changedTouches[0].clientY);
    if (Math.abs(dx) < 60 || dy > 80) return;
    if (dx > 0) {
      handleCollectionSwipeForward();
    } else {
      handleCollectionSwipeBackward();
    }
    setTouchStart(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  if (appView === "collection" && selectedCollection) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center max-w-[480px] mx-auto px-[15px] py-[61px]"
        onTouchStart={handleSessionTouchStart}
        onTouchEnd={handleCollectionSessionTouchEnd}
      >
        <header className="text-center mb-6 w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (collectionHistory.length > 0) {
                  handleCollectionSwipeBackward();
                } else {
                  handleBackToMain();
                }
              }}
              className="p-2 -ml-2 rounded-xl hover:bg-accent/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="text-left">
              <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                {selectedCollection.title}
              </h1>
              <p className="text-xs text-muted-foreground">Personal Collection</p>
            </div>
          </div>
        </header>

        <div className="flex-1 w-full flex flex-col items-center justify-center">
          {isCollectionDeckComplete ? (
            <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
              <PartyPopper className="w-16 h-16 text-secondary" />
              <h2 className="font-display text-2xl font-bold text-foreground">Bien joué! 🎉</h2>
              <p className="text-muted-foreground">You've mastered this collection!</p>
              <button
                onClick={handleBackToMain}
                className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                Back to Collections
              </button>
            </div>
          ) : currentCollectionCard ? (
            <Flashcard
              key={`collection-${selectedCollection.id}-${collectionQueue[0]}`}
              card={currentCollectionCard}
              onAdvance={handleCollectionAdvance}
              total={selectedCollection.entries.length}
              remaining={collectionQueue.length}
              onTranscriptRef={onTranscriptRef}
              isMicOn={isMicEnabled}
              onToggleMic={() => setIsMicEnabled(prev => !prev)}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen flex flex-col items-center max-w-[480px] mx-auto px-[15px] pt-[61px] ${selectedLevelId ? 'pb-36' : 'pb-24'}`}
      onTouchStart={handleSessionTouchStart}
      onTouchEnd={handleSessionTouchEnd}
    >
      {/* Header */}
      <header className="text-center mb-6 w-full">
        {selectedLevelId ? (
          <div className="w-full flex items-center gap-3">
            <button
              onClick={() => {
                if (history.length > 0) {
                  handleSwipeBackward();
                } else {
                  handleBack();
                }
              }}
              className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${allCards.length > 0 ? ((allCards.length - queue.length) / allCards.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground font-medium min-w-[40px] text-right">
              {allCards.length - queue.length}/{allCards.length}
            </span>
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 mr-[-8px] rounded-xl hover:bg-muted transition-colors"
                title="Options"
              >
                <MoreVertical className="w-5 h-5 text-foreground" />
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-card border border-border shadow-lg z-50 overflow-hidden animate-fade-in">
                    <button
                      onClick={handleShuffleDeck}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Shuffle className="w-4 h-4" />
                      Shuffle Cards
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        // Filter view to only show bookmarked cards in the queue
                        if (bookmarkedCards.length > 0) {
                          const validBookmarked = allCards.filter(c => bookmarkedCards.includes(c.id)).map(c => c.id);
                          if (validBookmarked.length > 0) {
                            setQueue(validBookmarked);
                            setSavedQueue(validBookmarked);
                          }
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors border-t border-border"
                    >
                      <Bookmark className="w-4 h-4" />
                      Study Bookmarked
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Welcome back 👋</p>
              <h1 className="font-display text-2xl font-bold text-foreground">Mimoe</h1>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">FR</span>
            </div>
          </div>
        )}
      </header>

      {/* Tabs */}
      {!selectedLevelId && (
        <>
          <div className="flex w-full bg-muted rounded-2xl p-1 mb-6">
            {(["vocabulary", "phrases"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabSwitch(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between w-full mb-4">
            <h2 className="font-display text-xl font-bold text-foreground">Levels</h2>
          </div>
        </>
      )}

      {/* Content */}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        {!selectedLevelId ? (
          <LevelSelect
            levels={levels}
            completedLevelIds={completedIds}
            onSelectLevel={startLevel}
            onAddLevel={() => setIsNewLevelModalOpen(true)}
            bookmarkedCount={bookmarkedLevel?.cards.length ?? 0}
            onStudyBookmarked={startBookmarkedSession}
          />
        ) : allCards.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center animate-fade-in py-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">No cards yet</h2>
            <p className="text-sm text-muted-foreground max-w-[260px]">
              Add cards to this level using the Word Bank below — single entries or bulk import.
            </p>
          </div>
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
            isBookmarked={bookmarkedCards.includes(currentCard.id)}
            onToggleBookmark={() => {
              setBookmarkedCards(prev => 
                prev.includes(currentCard.id) 
                  ? prev.filter(id => id !== currentCard.id)
                  : [...prev, currentCard.id]
              );
            }}
            isMicOn={isMicEnabled}
            onToggleMic={() => setIsMicEnabled(prev => !prev)}
            onAnimateAdvance={(fn) => { animateAdvanceRef.current = fn; }}
          />
        ) : null}
      </div>

      {/* Word bank — shown for any selected level (including empty new ones) */}
      {selectedLevelId && !isBookmarkedSession && (allCards.length === 0 || !isDeckComplete) && (
        <div className="mt-6 w-full flex justify-center">
          <WordBank
            items={allCards}
            onAdd={handleAddItem}
            onUpdate={handleUpdateItem}
            onDelete={handleDeleteItem}
            onBulkAdd={handleBulkAdd}
            onReorder={handleReorder}
            label={activeTab === "vocabulary" ? "Vocabulary" : "Phrases"}
          />
        </div>
      )}

      {/* Personal Space Section (Only on levels page) */}
      {!selectedLevelId && (
        <>
          <PersonalSpaceDivider />
          
          <div className="w-full space-y-4">
            <button
              onClick={handleCreateCollection}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white transition-colors font-medium bg-[#818898]/0"
            >
              <Plus className="w-5 h-5" />
              New Collection
            </button>

            {collections.length > 0 ? (
              <div className="grid gap-4">
                {collections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    onStudy={handleStudyCollection}
                    onEdit={handleEditCollection}
                    onDelete={handleDeleteCollection}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  Add your first collection — song lyrics, dialogues, anything.
                </p>
              </div>
            )}
          </div>

          <NewCollectionModal
            isOpen={isCollectionModalOpen}
            onClose={() => setIsCollectionModalOpen(false)}
            onSave={handleSaveCollection}
            editingCollection={editingCollection}
          />
        </>
      )}

      {/* Navigation Bars */}
      {!selectedLevelId && appView === "main" && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pb-safe">
          <div className="w-full max-w-[480px] flex items-center justify-around bg-card/90 backdrop-blur-xl border-t border-border py-[36px] px-[16px] rounded-full">
            <button className="flex flex-col items-center gap-1 text-primary">
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-medium">Home</span>
            </button>
            <button
              onClick={handleCreateCollection}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-secondary/30 active:scale-95 transition-transform bg-fuchsia-950 mx-0 mt-0"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
            <button className="flex flex-col items-center gap-1 text-muted-foreground">
              <User className="w-5 h-5" />
              <span className="text-[10px] font-medium">Profile</span>
            </button>
          </div>
        </nav>
      )}

      {selectedLevelId && !isDeckComplete && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="w-full bg-card/40 backdrop-blur-xl border-t border-white/10 px-6 py-3 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => {
                  if (history.length > 0) {
                    handleSwipeBackward();
                  }
                }}
                className="p-4 rounded-2xl hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </button>
              
              <button 
                onClick={() => setIsMicEnabled(!isMicEnabled)}
                className={`p-4 rounded-full transition-all duration-300 ${
                  isMicEnabled 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
                    : "bg-white/10 text-muted-foreground"
                }`}
              >
                {isMicEnabled ? <Activity className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={() => {
                  animateAdvanceRef.current?.("animate-swipe-right", { failed: false, requeue: false });
                }}
                className="p-4 rounded-2xl hover:bg-white/5 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      <NewLevelModal
        isOpen={isNewLevelModalOpen}
        onClose={() => setIsNewLevelModalOpen(false)}
        onSave={handleAddLevel}
      />
    </div>
  );
}
