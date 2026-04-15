import { useState, useCallback, useMemo, useEffect } from "react";
import { Flashcard } from "./Flashcard";
import { WordBank } from "./WordBank";
import { LevelSelect } from "./LevelSelect";
import { PersonalSpaceDivider } from "./PersonalSpaceDivider";
import { CollectionCard } from "./CollectionCard";
import { NewCollectionModal } from "./NewCollectionModal";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { vocabularyLevels, phraseLevels, type FlashcardItem } from "@/lib/flashcardData";
import { type Collection, CollectionFormData } from "@/lib/collectionTypes";
import { PartyPopper, ArrowLeft, Plus } from "lucide-react";

type Tab = "vocabulary" | "phrases";
type AppView = "main" | "collection";

export function FlashcardApp() {
  const [activeTab, setActiveTab] = useLocalStorage<Tab>("mimoe-active-tab", "vocabulary");
  const [selectedLevelId, setSelectedLevelId] = useLocalStorage<string | null>("mimoe-selected-level", null);
  const [savedQueue, setSavedQueue] = useLocalStorage<string[]>("mimoe-saved-queue", []);
  
  // Progress tracking state - temporarily disabled
  // const [levelProgress, setLevelProgress] = useLocalStorage<Record<string, { correct: number; total: number; allCorrect: boolean }>>("mimoe-level-progress", {});
  // const [currentSessionCorrect, setCurrentSessionCorrect] = useState<string[]>([]);
  
  // Personal Space state
  const [appView, setAppView] = useState<AppView>("main");
  const [collections, setCollections] = useLocalStorage<Collection[]>("mimoe-collections", []);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | undefined>();
  const [collectionQueue, setCollectionQueue] = useState<string[]>([]);

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
    const restoreProgress = () => {
      if (selectedLevelId && savedQueue.length > 0) {
        // Validate that the saved queue still matches the current level
        const level = levels.find((l) => l.id === selectedLevelId);
        if (level) {
          const custom = customCards[selectedLevelId] || [];
          const allValidIds = [...level.cards, ...custom].map((c) => c.id);
          const validQueue = savedQueue.filter(id => allValidIds.includes(id));
          // Only restore if we have valid cards and queue is empty
          if (validQueue.length > 0 && queue.length === 0) {
            setQueue(validQueue);
          }
        }
      }
    };

    // Debounce restoration to prevent rapid changes
    const timeoutId = setTimeout(restoreProgress, 200);
    return () => clearTimeout(timeoutId);
  }, [selectedLevelId, savedQueue, levels, customCards, queue.length]);

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
    // setCurrentSessionCorrect([]);
  }, [levels, customCards]);

  const currentCard = useMemo(() => {
    if (queue.length === 0) return null;
    return allCards.find((i) => i.id === queue[0]) || null;
  }, [queue, allCards]);

  const handleCorrect = useCallback(() => {
    // if (selectedLevelId && currentCard) {
    //   // Track correct answer for this session
    //   setCurrentSessionCorrect(prev => [...prev, currentCard.id]);
    // }
    setQueue((q) => q.slice(1));
  }, [selectedLevelId, currentCard]);

  const handleIncorrect = useCallback(() => {
    setQueue((q) => [...q.slice(1), q[0]]);
  }, []);

  const isDeckComplete = queue.length === 0 && selectedLevelId !== null;

  // Update progress when deck finishes - temporarily disabled
  // const updateProgress = useCallback(() => {
  //   if (selectedLevelId && selectedLevel) {
  //     const totalCards = allCards.length;
  //     const correctCards = currentSessionCorrect.length;
  //     const allCorrect = correctCards === totalCards;
  //     
  //     // Update progress tracking
  //     setLevelProgress(prev => ({
  //       ...prev,
  //       [selectedLevelId]: {
  //         correct: correctCards,
  //         total: totalCards,
  //         allCorrect
  //       }
  //     }));
  //     
  //     // Only mark as completed if all answers were correct
  //     if (allCorrect && !completedIds.includes(selectedLevelId)) {
  //       setCompletedIds((prev) => [...prev, selectedLevelId]);
  //     }
  //     
  //     // Reset session tracking
  //     setCurrentSessionCorrect([]);
  //   }
  // }, [selectedLevelId, selectedLevel, allCards, currentSessionCorrect, completedIds, setCompletedIds, setLevelProgress]);

  // if (isDeckComplete && selectedLevelId) {
  //   updateProgress();
  // }

  // Temporary fallback - mark as completed when deck finishes
  if (isDeckComplete && selectedLevelId && !completedIds.includes(selectedLevelId)) {
    setCompletedIds((prev) => [...prev, selectedLevelId]);
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

  const handleBulkAdd = useCallback(
    (entries: { english: string; french: string }[]) => {
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

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedLevelId(null);
    setQueue([]);
    // setCurrentSessionCorrect([]);
  };

  // Collection management functions
  const handleCreateCollection = useCallback(() => {
    setEditingCollection(undefined);
    setIsCollectionModalOpen(true);
  }, []);

  const handleSaveCollection = useCallback((data: CollectionFormData) => {
    if (editingCollection) {
      // Update existing collection
      setCollections(prev => prev.map(col => 
        col.id === editingCollection.id 
          ? { ...col, ...data, updatedAt: new Date().toISOString() }
          : col
      ));
    } else {
      // Create new collection
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
    setSelectedCollection(collection);
    const queueIds = collection.entries.map((_, index) => `collection-${collection.id}-${index}`);
    setCollectionQueue(queueIds);
    setAppView("collection");
  }, []);

  const handleBackToMain = useCallback(() => {
    setAppView("main");
    setSelectedCollection(null);
    setCollectionQueue([]);
  }, []);

  // Collection flashcard functions
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

  const handleCollectionCorrect = useCallback(() => {
    setCollectionQueue(q => q.slice(1));
  }, []);

  const handleCollectionIncorrect = useCallback(() => {
    setCollectionQueue(q => [...q.slice(1), q[0]]);
  }, []);

  const isCollectionDeckComplete = collectionQueue.length === 0 && selectedCollection !== null;

  if (appView === "collection" && selectedCollection) {
    // Collection Study Mode
    return (
      <div className="min-h-screen flex flex-col items-center max-w-[480px] mx-auto px-[15px] py-[61px]">
        {/* Header */}
        <header className="text-center mb-6 w-full">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToMain} className="p-2 -ml-2 rounded-xl hover:bg-accent/50 transition-colors">
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

        {/* Content */}
        <div className="flex-1 w-full flex flex-col items-center justify-center">
          {isCollectionDeckComplete ? (
            <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
              <PartyPopper className="w-16 h-16 text-secondary" />
              <h2 className="font-display text-2xl font-bold text-foreground">
                Bien joué! 🎉
              </h2>
              <p className="text-muted-foreground">
                You've mastered this collection!
              </p>
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
              onCorrect={handleCollectionCorrect}
              onIncorrect={handleCollectionIncorrect}
              total={selectedCollection.entries.length}
              remaining={collectionQueue.length}
            />
          ) : null}
        </div>
      </div>
    );
  }

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
            onBulkAdd={handleBulkAdd}
            label={activeTab === "vocabulary" ? "Vocabulary" : "Phrases"}
          />
        </div>
      )}

      {/* Personal Space Section */}
      <PersonalSpaceDivider />
      
      <div className="w-full space-y-4">
        {/* New Collection Button */}
        <button
          onClick={handleCreateCollection}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Collection
        </button>

        {/* Collections Grid */}
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

      {/* New Collection Modal */}
      <NewCollectionModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        onSave={handleSaveCollection}
        editingCollection={editingCollection}
      />
    </div>
  );
}
