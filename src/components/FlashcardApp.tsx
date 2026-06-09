import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logoLight from "@/assets/logo-light.png";
import { Flashcard, type BandStyle } from "./Flashcard";
import { WordBank } from "./WordBank";
import { LevelSelect, BAND_IMGS, WavyLine } from "./LevelSelect";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CollectionCard } from "./CollectionCard";
import { NewCollectionModal } from "./NewCollectionModal";
import { NewLevelModal } from "./NewLevelModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { vocabularyLevels, phraseLevels, arabicVocabularyLevels, arabicPhraseLevels, type FlashcardItem } from "@/lib/flashcardData";
import { type Collection, CollectionFormData, COLLECTION_CATEGORIES } from "@/lib/collectionTypes";
import { prefetchAudio, unlockAudio } from "@/lib/speechUtils";
import { LANGUAGE_CONFIGS, ARABIC_DIALECTS, getArabicConfigForDialect, type Language } from "@/lib/languageConfig";
import { ArrowLeft, Plus, MoreVertical, Shuffle, Bookmark, User, X, CheckCircle2, Share2, BookOpen, PartyPopper } from "lucide-react";

type Tab = "vocabulary" | "phrases";
type AppView = "main" | "collection";

export function FlashcardApp() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeLanguage, setActiveLanguage] = useLocalStorage<Language>("mimoe-language", "french");
  const [activeTab, setActiveTab] = useLocalStorage<Tab>("mimoe-active-tab", "vocabulary");
  const [selectedLevelId, setSelectedLevelId] = useLocalStorage<string | null>("mimoe-selected-level", null);
  const [savedQueue, setSavedQueue] = useLocalStorage<string[]>("mimoe-saved-queue", []);

  const [completedVocab, setCompletedVocab] = useLocalStorage<string[]>("mimoe-completed-vocab", []);
  const [completedPhrases, setCompletedPhrases] = useLocalStorage<string[]>("mimoe-completed-phrases", []);

  const [selectedBand, setSelectedBand] = useState<"A1" | "A2" | "B1" | null>(null);

  // Band colors — gradient palettes matching the home cards (3 vivid stops each)
  const BAND_STYLES: Record<"A1"|"A2"|"B1", BandStyle> = {
    A1: activeLanguage === "arabic" ? {
      cardBg:    "#E8A020",  // sandy gold
      ghost1:    "#F5C842",  // warm amber
      ghost2:    "#C86428",  // burnt orange
      lines:     "rgba(255,200,80,0.07)",
      bar:       "linear-gradient(90deg, #E8A020 0%, #F5C842 55%, #C86428 100%)",
      curl:      "linear-gradient(140deg, #C86428 0%, #F5C842 50%, #E8A020 100%)",
      textColor: "#FFFFFF",
    } : {
      cardBg:    "#E8D5B0",  // warm beige
      ghost1:    "#ECBEB4",  // blush
      ghost2:    "#C9A870",  // deeper beige/tan
      lines:     "rgba(255,235,200,0.07)",
      bar:       "linear-gradient(90deg, #E8D5B0 0%, #ECBEB4 55%, #519E8A 100%)",
      curl:      "linear-gradient(140deg, #519E8A 0%, #ECBEB4 50%, #E8D5B0 100%)",
      textColor: "#FFFFFF",
    },
    A2: {
      cardBg:    "#0EA5E9",  // sky blue midpoint
      ghost1:    "#38BDF8",  // lighter sky
      ghost2:    "#059669",  // deep emerald
      lines:     "rgba(0,50,100,0.10)",
      bar:       "linear-gradient(90deg, #059669 0%, #0EA5E9 50%, #6366F1 100%)",
      curl:      "linear-gradient(140deg, #6366F1 0%, #0EA5E9 50%, #059669 100%)",
      textColor: "#FFFFFF",
    },
    B1: {
      cardBg:    "#7C3AED",  // rich violet midpoint
      ghost1:    "#9B6FF4",  // lighter violet
      ghost2:    "#4F46E5",  // deep indigo
      lines:     "rgba(60,20,140,0.10)",
      bar:       "linear-gradient(90deg, #4F46E5 0%, #7C3AED 50%, #C026D3 100%)",
      curl:      "linear-gradient(140deg, #C026D3 0%, #7C3AED 50%, #4F46E5 100%)",
      textColor: "#FFFFFF",
    },
  };
  const DEFAULT_BAND_STYLE: BandStyle = {
    cardBg:    "#FFD000",
    ghost1:    "#F0C400",
    ghost2:    "#E5B800",
    lines:     "rgba(0,0,0,0.07)",
    bar:       "#FFD000",
    curl:      "linear-gradient(140deg,#fffde0 0%,#f5ef90 40%,#e8d840 70%,#d4c020 100%)",
    textColor: "#1a0e00",
  };
  // Personal Space state
  const [appView, setAppView] = useState<AppView>("main");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | undefined>();
  const [collectionQueue, setCollectionQueue] = useState<string[]>([]);

  const [customVocab, setCustomVocab] = useState<Record<string, FlashcardItem[]>>({});
  const [customPhrases, setCustomPhrases] = useState<Record<string, FlashcardItem[]>>({});

  // User-created levels (loaded from DB per tab+language)
  const [customVocabLevels, setCustomVocabLevels] = useState<{ id: string; title: string; dialect?: string }[]>([]);
  const [customPhraseLevels, setCustomPhraseLevels] = useState<{ id: string; title: string; dialect?: string }[]>([]);
  const [isNewLevelModalOpen, setIsNewLevelModalOpen] = useState(false);

  // Track which cards were answered correctly on FIRST attempt in current session
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState<Set<string>>(new Set());
  const [failedCards, setFailedCards] = useState<Set<string>>(new Set());
  const [comboCount, setComboCount] = useState(0);
  const [bookmarkedCards, setBookmarkedCards] = useState<string[]>([]);

  // Special "bookmarked" study session — synthetic level
  const [isBookmarkedSession, setIsBookmarkedSession] = useState(false);

  const [customOrder, setCustomOrder] = useLocalStorage<Record<string, string[]>>("mimoe-custom-order", {});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWordBankOpen, setIsWordBankOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<"levels" | "personal">("levels");


  const baseLevels = useMemo(() => {
    const vocabSource = activeLanguage === "arabic" ? arabicVocabularyLevels : vocabularyLevels;
    const phraseSource = activeLanguage === "arabic" ? arabicPhraseLevels : phraseLevels;
    return activeTab === "vocabulary" ? vocabSource : phraseSource;
  }, [activeLanguage, activeTab]);
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

  // Derive band style — placed here so both `levels` and `selectedLevelId` are defined
  const currentBandStyle: BandStyle = (() => {
    if (selectedLevelId) {
      const lvl = levels.find(l => l.id === selectedLevelId);
      if (lvl?.cefr && BAND_STYLES[lvl.cefr]) return BAND_STYLES[lvl.cefr];
    }
    if (selectedBand && BAND_STYLES[selectedBand]) return BAND_STYLES[selectedBand];
    return DEFAULT_BAND_STYLE;
  })();

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

  // Compute the active language config (with dialect override if Arabic)
  const customLevelDialect = selectedLevelId
    ? customLevelsList.find(l => l.id === selectedLevelId)?.dialect ?? null
    : null;
  const sessionDialect: string | null = customLevelDialect ?? selectedCollection?.dialect ?? null;

  const langConfig = activeLanguage === "arabic"
    ? (sessionDialect ? getArabicConfigForDialect(sessionDialect) : LANGUAGE_CONFIGS.arabic)
    : LANGUAGE_CONFIGS.french;

  const animateAdvanceRef = useRef<((exitClass: string, opts: { failed: boolean; requeue: boolean }) => void) | null>(null);
  const handleBackRef = useRef<() => void>(() => {});

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Back gesture / hardware back button (ref is kept fresh below, after handleBack is defined)
  useEffect(() => {
    const onPop = () => { handleBackRef.current(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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

  // Load collections + bookmarks on user/language change
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [cols, bms] = await Promise.all([
          db.listCollections(),
          db.listBookmarks(activeLanguage),
        ]);
        setCollections(cols);
        setBookmarkedCards(bms);
      } catch (e) {
        console.error("Failed to load collections/bookmarks", e);
      }
    })();
  }, [user, activeLanguage]);

  // Load custom levels + their cards for the current tab+language
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const rows = await db.listCustomLevels(activeTab, activeLanguage);
        const lvls = rows.map((r) => ({ id: r.id, title: r.title, ...(r.dialect ? { dialect: r.dialect } : {}) }));
        if (activeTab === "vocabulary") setCustomVocabLevels(lvls);
        else setCustomPhraseLevels(lvls);

        const cardsByLevel: Record<string, FlashcardItem[]> = {};
        await Promise.all(
          rows.map(async (r) => {
            cardsByLevel[r.id] = await db.listCustomCards(r.id);
          })
        );
        if (activeTab === "vocabulary") setCustomVocab(cardsByLevel);
        else setCustomPhrases(cardsByLevel);
      } catch (e) {
        console.error("Failed to load custom levels", e);
      }
    })();
  }, [user, activeTab, activeLanguage]);

  // Restore progress on component mount
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return;
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
    if (levels.length > 0) {
      hasRestoredRef.current = true;
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
    window.history.pushState({ mimoe: 'level' }, '', window.location.pathname);
    unlockAudio();
    setIsBookmarkedSession(false);
    const custom = customCards[level.id] || [];
    const allItems = [...level.cards, ...custom];
    const allIds = allItems.map((c) => c.id);
    setQueue(allIds);
    setSelectedLevelId(levelId);
    setFirstAttemptCorrect(new Set());
    setFailedCards(new Set());
    setComboCount(0);
    setHistory([]);
    // Pre-warm TTS cache for first 3 cards
    prefetchAudio(allItems.slice(0, 3).map((c) => c.target ?? c.french ?? ""), langConfig);
  }, [levels, customCards, langConfig]);

  const startBookmarkedSession = useCallback(() => {
    if (!bookmarkedLevel || bookmarkedLevel.cards.length === 0) return;
    unlockAudio();
    setIsBookmarkedSession(true);
    setSelectedLevelId(bookmarkedLevel.id);
    setQueue(bookmarkedLevel.cards.map((c) => c.id));
    setFirstAttemptCorrect(new Set());
    setFailedCards(new Set());
    setHistory([]);
    prefetchAudio(bookmarkedLevel.cards.slice(0, 3).map((c) => c.target ?? c.french ?? ""), langConfig);
  }, [bookmarkedLevel, langConfig]);

  const handleAddLevel = useCallback(async (title: string, dialect?: string) => {
    try {
      const row = await db.createCustomLevel({ title, tab: activeTab, language: activeLanguage, dialect });
      setCustomLevelsList((prev) => [...prev, { id: row.id, title: row.title, ...(row.dialect ? { dialect: row.dialect } : {}) }]);
    } catch (e) {
      console.error("Failed to create level", e);
    }
  }, [activeTab, activeLanguage, setCustomLevelsList]);

  const currentCard = useMemo(() => {
    if (queue.length === 0) return null;
    return allCards.find((i) => i.id === queue[0]) || null;
  }, [queue, allCards]);

  const collectionCards = useMemo<FlashcardItem[]>(() => {
    if (!selectedCollection) return [];
    return selectedCollection.entries.map((entry, index) => ({
      id: `collection-${selectedCollection.id}-${index}`,
      english: entry.english,
      french: entry.french,
      target: entry.target ?? entry.french,
      ...(entry.alternatives && entry.alternatives.length > 0 ? { alternatives: entry.alternatives } : {}),
    }));
  }, [selectedCollection]);

  const currentCollectionCard = useMemo(() => {
    if (collectionQueue.length === 0 || !selectedCollection) return null;
    const firstQueueId = collectionQueue[0];
    const index = parseInt(firstQueueId.split('-').pop() || '0');
    return collectionCards[index] || null;
  }, [collectionQueue, collectionCards, selectedCollection]);



  const handleAdvance = useCallback(({ failed, requeue }: { failed: boolean; requeue: boolean }) => {
    const cardId = queue[0];
    if (!cardId) return;
    if (failed) {
      setFailedCards(prev => new Set(prev).add(cardId));
    } else {
      setFirstAttemptCorrect(prev => new Set(prev).add(cardId));
    }
    // Streak logic:
    //  • WRONG_FINAL (failed + requeued)  → reset streak
    //  • Card completed (not requeued)    → increment (covers correct 1st try AND correct on retry)
    //  • "Can't speak now" (!failed + requeued) → neutral, streak holds
    if (failed && requeue) {
      setComboCount(0);
    } else if (!requeue) {
      setComboCount(prev => prev + 1);
    }
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
    if (selectedLevelId) {
      setIsBookmarkedSession(false);
      setSelectedLevelId(null);
      setSavedQueue([]);
      setQueue([]);
      setFirstAttemptCorrect(new Set());
      setFailedCards(new Set());
      setHistory([]);
    } else if (selectedBand) {
      setSelectedBand(null);
    }
  }, [selectedLevelId, selectedBand]);

  // Keep back-handler ref fresh (must be after handleBack is defined)
  useEffect(() => { handleBackRef.current = handleBack; }, [handleBack]);

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

  const isCustomDbLevel = useCallback(
    (id: string | null) => !!id && customLevelsList.some((l) => l.id === id),
    [customLevelsList]
  );

  const handleAddItem = useCallback(
    async (english: string, french: string, alternatives?: string[]) => {
      if (!selectedLevelId) return;
      if (isCustomDbLevel(selectedLevelId)) {
        try {
          const created = await db.createCustomCard({
            levelId: selectedLevelId,
            english,
            target: french,
            alternatives,
            position: (customCards[selectedLevelId]?.length ?? 0),
          });
          setCustomCards((prev) => ({
            ...prev,
            [selectedLevelId]: [...(prev[selectedLevelId] || []), created],
          }));
          setQueue((prev) => [...prev, created.id]);
        } catch (e) {
          console.error("Failed to add card", e);
        }
      } else {
        const id = `custom-${Date.now()}`;
        const newItem: FlashcardItem = { id, english, french, target: french, ...(alternatives && alternatives.length > 0 ? { alternatives } : {}) };
        setCustomCards((prev) => ({
          ...prev,
          [selectedLevelId]: [...(prev[selectedLevelId] || []), newItem],
        }));
        setQueue((prev) => [...prev, id]);
      }
    },
    [selectedLevelId, setCustomCards, customCards, isCustomDbLevel]
  );

  const handleUpdateItem = useCallback(
    async (id: string, english: string, french: string, alternatives?: string[]) => {
      if (!selectedLevelId) return;
      const updatedItem: FlashcardItem = { id, english, french, target: french, ...(alternatives && alternatives.length > 0 ? { alternatives } : {}) };
      if (isCustomDbLevel(selectedLevelId)) {
        try { await db.updateCustomCard(id, { english, target: french, alternatives }); }
        catch (e) { console.error("Failed to update card", e); }
      }
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
    [selectedLevelId, setCustomCards, isCustomDbLevel]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      if (!selectedLevelId) return;
      if (isCustomDbLevel(selectedLevelId)) {
        try { await db.deleteCustomCard(id); } catch (e) { console.error("Failed to delete card", e); }
      }
      setCustomCards((prev) => ({
        ...prev,
        [selectedLevelId]: (prev[selectedLevelId] || []).filter((i) => i.id !== id),
      }));
      setQueue((prev) => prev.filter((i) => i !== id));
      setHistory((prev) => prev.filter((i) => i !== id));
    },
    [selectedLevelId, setCustomCards, isCustomDbLevel]
  );

  const handleBulkAdd = useCallback(
    async (entries: { english: string; french: string; alternatives?: string[] }[]) => {
      if (!selectedLevelId) return;
      if (isCustomDbLevel(selectedLevelId)) {
        try {
          const created = await db.bulkCreateCustomCards(
            selectedLevelId,
            entries.map((e) => ({ english: e.english, target: e.french, alternatives: e.alternatives })),
          );
          setCustomCards((prev) => ({
            ...prev,
            [selectedLevelId]: [...(prev[selectedLevelId] || []), ...created],
          }));
          setQueue((prev) => [...prev, ...created.map((c) => c.id)]);
        } catch (e) {
          console.error("Failed to bulk add", e);
        }
      } else {
        const newItems: FlashcardItem[] = entries.map((entry) => {
          const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          return { id, english: entry.english, french: entry.french, target: entry.french, ...(entry.alternatives && entry.alternatives.length > 0 ? { alternatives: entry.alternatives } : {}) };
        });
        setCustomCards((prev) => ({
          ...prev,
          [selectedLevelId]: [...(prev[selectedLevelId] || []), ...newItems],
        }));
        setQueue((prev) => [...prev, ...newItems.map((item) => item.id)]);
      }
    },
    [selectedLevelId, setCustomCards, isCustomDbLevel]
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
    setHistory([]);
    setCustomOrder(prev => ({ ...prev, [selectedLevelId]: shuffledIds }));
    setIsMenuOpen(false);
  };

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedLevelId(null);
    setQueue([]);
    setFirstAttemptCorrect(new Set());
    setFailedCards(new Set());
    setHistory([]);
  };

  // Collection management functions
  const handleCreateCollection = useCallback(() => {
    setEditingCollection(undefined);
    setIsCollectionModalOpen(true);
  }, []);

  const handleSaveCollection = useCallback(async (data: CollectionFormData) => {
    if (editingCollection) {
      try {
        await db.updateCollection(editingCollection.id, {
          title: data.title,
          dialect: data.dialect,
          category: data.category,
          entries: data.entries,
        });
        setCollections(prev => prev.map(col =>
          col.id === editingCollection.id
            ? { ...col, title: data.title, dialect: data.dialect, category: data.category, entries: data.entries, language: data.language ?? col.language }
            : col
        ));
      } catch (e) {
        console.error("Failed to update collection", e);
      }
    } else {
      try {
        const created = await db.createCollection({
          title: data.title,
          language: data.language ?? activeLanguage,
          dialect: data.dialect,
          category: data.category,
          entries: data.entries,
        });
        setCollections(prev => [...prev, created]);
      } catch (e) {
        console.error("Failed to create collection", e);
      }
    }
  }, [editingCollection, activeLanguage]);

  const handleEditCollection = useCallback((collection: Collection) => {
    setEditingCollection(collection);
    setIsCollectionModalOpen(true);
  }, []);

  const handleDeleteCollection = useCallback(async (collectionId: string) => {
    try { await db.deleteCollection(collectionId); } catch (e) { console.error("Failed to delete collection", e); }
    setCollections(prev => prev.filter(col => col.id !== collectionId));
  }, []);

  const handleStudyCollection = useCallback((collection: Collection) => {
    unlockAudio();
    setSelectedCollection(collection);
    const queueIds = collection.entries.map((_, index) => `collection-${collection.id}-${index}`);
    setCollectionQueue(queueIds);
    setCollectionHistory([]);
    const collLang = collection.language === "arabic"
      ? (collection.dialect ? getArabicConfigForDialect(collection.dialect) : LANGUAGE_CONFIGS.arabic)
      : LANGUAGE_CONFIGS.french;
    prefetchAudio(collection.entries.slice(0, 3).map((e) => e.target ?? e.french ?? ""), collLang);
    setAppView("collection");
  }, []);

  const handleBackToMain = useCallback(() => {
    setAppView("main");
    setSelectedCollection(null);
    setCollectionQueue([]);
    setCollectionHistory([]);
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
    // On home (no level/band), swipe switches pivot tab
    if (!selectedLevelId && !selectedBand) {
      if (dx > 0) setHomeTab("personal");
      else setHomeTab("levels");
      setTouchStart(null);
      return;
    }
    if (dx > 0) {
      handleSwipeForward();
    } else {
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
              onClick={handleBackToMain}
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
              bandStyle={currentBandStyle}
              langConfig={
                selectedCollection.language === "arabic"
                  ? (selectedCollection.dialect ? getArabicConfigForDialect(selectedCollection.dialect) : LANGUAGE_CONFIGS.arabic)
                  : LANGUAGE_CONFIGS.french
              }
            />
          ) : null}
        </div>
      </div>
    );
  }

  // Band info for when selectedBand is set
  const selectedBandInfo = selectedBand ? {
    A1: { hex: activeLanguage === "arabic"
        ? "linear-gradient(140deg, #E8A020 0%, #F5C842 55%, #C86428 100%)"
        : "linear-gradient(140deg, #E8D5B0 0%, #ECBEB4 55%, #519E8A 100%)", img: BAND_IMGS.A1, title: "Your starting point", subtitle: "Greetings, numbers, core verbs, basics" },
    A2: { hex: "linear-gradient(140deg, #059669 0%, #0EA5E9 50%, #6366F1 100%)", img: BAND_IMGS.A2, title: "Daily life", subtitle: "Routines, travel, shopping, past tense" },
    B1: { hex: "linear-gradient(140deg, #4F46E5 0%, #7C3AED 50%, #C026D3 100%)", img: BAND_IMGS.B1, title: "Real conversation", subtitle: "Opinions, work, emotions, storytelling" },
  }[selectedBand] : null;

  const decksInBand = selectedBand ? levels.filter(l => l.cefr === selectedBand) : [];
  const completedInBand = decksInBand.filter(d => completedIds.includes(d.id)).length;

  return (
    <div
      className={`min-h-screen flex flex-col items-center max-w-[480px] mx-auto ${selectedLevelId ? 'pt-[61px]' : 'pt-0'} px-[15px] ${selectedLevelId ? 'pb-36' : 'pb-24'}`}
      onTouchStart={handleSessionTouchStart}
      onTouchEnd={handleSessionTouchEnd}
    >
      {/* Band header — edge-to-edge at top, only in deck list */}
      {selectedBand && selectedBandInfo && !selectedLevelId && (
        <div
          className="w-full mb-6 flex flex-col justify-between"
          style={{
            background: selectedBandInfo.hex,
            minHeight: "240px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            borderRadius: "0 0 36px 36px",
            margin: "0 -15px",
            width: "calc(100% + 30px)",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
            paddingBottom: "24px",
            paddingLeft: "24px",
            paddingRight: "24px",
          }}
        >
          {/* Top: Back + Search + French pill */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSelectedBand(null)}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </button>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-black">
                <span>{LANGUAGE_CONFIGS[activeLanguage].flag}</span>
                <span>{LANGUAGE_CONFIGS[activeLanguage].label}</span>
              </span>
            </div>
          </div>

          {/* Bottom: Band info */}
          <div>
            <div className="flex items-start gap-3 mb-3">
              <img
                src={selectedBandInfo.img}
                alt=""
                className="w-16 h-16 object-contain flex-shrink-0"
                style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.4))" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
              />
              <div className="flex-1">
                <span className="text-white/70 text-xs font-bold px-2 py-0.5 rounded-full bg-white/15 inline-block">
                  {selectedBand} · {completedInBand}/{decksInBand.length}
                </span>
              </div>
            </div>
            <h2 className="text-white font-black text-2xl leading-tight mb-1">{selectedBandInfo.title}</h2>
            <WavyLine className="max-w-[140px] mb-2" colors={["rgba(255,255,255,0.6)", "rgba(255,255,255,0.25)"]} />
            <p className="text-white/60 text-xs mb-3">{selectedBandInfo.subtitle}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    width: decksInBand.length > 0 ? `${(completedInBand / decksInBand.length) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header — extends corner-to-corner at top */}
      <header
        className="text-center mb-6 flex w-full px-5"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)', paddingBottom: '12px' }}
      >
        {selectedLevelId ? (
          <div className="w-full flex flex-col gap-3">
            {/* Top row: X + progress bar + streak icons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:opacity-60 transition-opacity"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>

              {/* Progress bar with streak badge */}
              <div className="flex-1 relative">
                {comboCount >= 2 && (
                  <div className="absolute -top-[22px] left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full animate-combo-pop"
                    style={{ background: "rgba(249,115,22,0.18)", border: "1px solid rgba(249,115,22,0.35)" }}>
                    <span className="text-[11px] leading-none">🔥</span>
                    <span className="text-[9px] font-black text-orange-400 whitespace-nowrap">{comboCount} in a row</span>
                  </div>
                )}
                <div className="h-[14px] rounded-full bg-[#252f45] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      background: currentBandStyle.bar,
                      width: `${allCards.length > 0 ? ((allCards.length - queue.length) / allCards.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-white/30" />
                  </button>
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden z-50 animate-slide-up-in"
                        style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
                        <button
                          onClick={handleShuffleDeck}
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Shuffle className="w-4 h-4" />
                          Shuffle Cards
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            if (bookmarkedCards.length > 0) {
                              const validBookmarked = allCards.filter(c => bookmarkedCards.includes(c.id)).map(c => c.id);
                              if (validBookmarked.length > 0) {
                                setQueue(validBookmarked);
                                setSavedQueue(validBookmarked);
                                setHistory([]);
                              }
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <Bookmark className="w-4 h-4" />
                          Study Bookmarked
                        </button>
                        <button
                          onClick={() => { setIsMenuOpen(false); setIsWordBankOpen(true); }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <BookOpen className="w-4 h-4" />
                          Word Bank
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Instruction label */}
            <div>
              <h2 className="text-white font-black text-[1.3rem] leading-tight">Speak fluency into existence</h2>
              <WavyLine className="mt-1 max-w-[120px]" />
            </div>
          </div>
        ) : !selectedBand ? (
          /* ── Home header: logo | centered lang pill | notification ── */
          <div className="w-full flex items-center relative">
            {/* Left: logo */}
            <img src={logoLight} alt="Mimoe" className="h-8 w-auto flex-shrink-0" />

            {/* Center: language pill — absolutely positioned */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <div className="relative">
                <button
                  onClick={() => setIsLangDropdownOpen(v => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-white/80 transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <span className="text-sm leading-none">{LANGUAGE_CONFIGS[activeLanguage].flag}</span>
                  <span>{LANGUAGE_CONFIGS[activeLanguage].label}</span>
                  <svg className="w-2.5 h-2.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                {isLangDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLangDropdownOpen(false)} />
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-2xl overflow-hidden z-50 min-w-[150px]"
                      style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}
                    >
                      {(["french", "arabic"] as Language[]).map((lang) => {
                        const cfg = LANGUAGE_CONFIGS[lang];
                        return (
                          <button
                            key={lang}
                            onClick={() => { setActiveLanguage(lang); setIsLangDropdownOpen(false); handleBack(); }}
                            className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold transition-colors text-left ${
                              activeLanguage === lang ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <span className="text-base">{cfg.flag}</span>
                            <span className="flex-1">{cfg.label}</span>
                            {activeLanguage === lang && (
                              <svg className="w-3.5 h-3.5 text-white/60 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: notification bell */}
            <div className="relative ml-auto">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-black text-black flex items-center justify-center" style={{ background: '#a855f7' }}>9</span>
            </div>
          </div>
        ) : null /* deck list — band card above serves as header */}
      </header>

      {/* Pivot header — Levels / Personal */}
      {!selectedLevelId && !selectedBand && (
        <div className="flex flex-col w-full mb-4">
          <div className="flex items-baseline gap-5">
            <button onClick={() => setHomeTab("levels")}>
              <span className={`font-black tracking-tight leading-none transition-all duration-300 ${
                homeTab === "levels" ? "text-[2.6rem] text-white" : "text-[1.5rem] text-white/35"
              }`}>Levels</span>
            </button>
            <button onClick={() => setHomeTab("personal")}>
              <span className={`font-black tracking-tight leading-none transition-all duration-300 ${
                homeTab === "personal" ? "text-[2.6rem] text-white" : "text-[1.5rem] text-white/35"
              }`}>Personal</span>
            </button>
          </div>
          <WavyLine className="mt-2 max-w-[200px]" />
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 w-full flex flex-col items-center ${selectedLevelId ? 'justify-center' : 'justify-start'}`}>
        {!selectedLevelId ? (
          /* Sliding pivot panels */
          <div className="w-full overflow-x-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: homeTab === "levels" ? "translateX(0)" : "translateX(-100%)" }}
            >
              {/* ── Levels panel ── */}
              <div className="min-w-full">
                <LevelSelect
                  levels={levels}
                  completedLevelIds={completedIds}
                  onSelectLevel={(levelId) => startLevel(levelId)}
                  onAddLevel={() => setIsNewLevelModalOpen(true)}
                  bookmarkedCount={bookmarkedLevel?.cards.length ?? 0}
                  onStudyBookmarked={startBookmarkedSession}
                  selectedBand={selectedBand}
                  onSelectBand={(band) => {
                    window.history.pushState({ mimoe: 'band' }, '', window.location.pathname);
                    setSelectedBand(band);
                  }}
                  onBack={() => setSelectedBand(null)}
                  activeLanguage={activeLanguage}
                />
              </div>
              {/* ── Personal panel ── */}
              <div className="min-w-full">
                <div className="w-full space-y-5">
                  <button
                    onClick={handleCreateCollection}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white transition-colors font-medium bg-[#818898]/0"
                  >
                    <Plus className="w-5 h-5" />
                    New Collection
                  </button>
                  {collections.length > 0 ? (() => {
                    // Group by category; uncategorized last
                    const groups: { cat: typeof COLLECTION_CATEGORIES[number] | null; items: Collection[] }[] = [];
                    const catMap = new Map<string, Collection[]>();
                    const uncategorized: Collection[] = [];
                    for (const col of collections) {
                      if (col.category) {
                        if (!catMap.has(col.category)) catMap.set(col.category, []);
                        catMap.get(col.category)!.push(col);
                      } else {
                        uncategorized.push(col);
                      }
                    }
                    for (const catDef of COLLECTION_CATEGORIES) {
                      if (catMap.has(catDef.value)) {
                        groups.push({ cat: catDef, items: catMap.get(catDef.value)! });
                      }
                    }
                    if (uncategorized.length > 0) groups.push({ cat: null, items: uncategorized });
                    return (
                      <div className="space-y-6">
                        {groups.map(({ cat, items }) => (
                          <div key={cat?.value ?? "__none"}>
                            {cat && (
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-base">{cat.emoji}</span>
                                <span className="text-xs font-bold text-white/40 uppercase tracking-wider">{cat.label}</span>
                              </div>
                            )}
                            <div className="grid gap-4">
                              {items.map((collection) => (
                                <CollectionCard
                                  key={collection.id}
                                  collection={collection}
                                  onStudy={handleStudyCollection}
                                  onEdit={handleEditCollection}
                                  onDelete={handleDeleteCollection}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })() : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Add your first collection — song lyrics, dialogues, anything.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
          <div className="w-full flex flex-wrap gap-2 justify-center animate-slide-up-in pb-4">
            {allCards.map(card => (
              <span
                key={card.id}
                className={`px-4 py-2.5 rounded-2xl border-2 font-semibold text-sm ${
                  failedCards.has(card.id)
                    ? "border-[#ffc800]/40 text-[#ffc800] bg-[#ffc800]/10"
                    : "border-[#58cc02]/40 text-[#58cc02] bg-[#58cc02]/10"
                }`}
              >
                {card.target ?? card.french ?? card.english}
              </span>
            ))}
          </div>
        ) : currentCard ? (
          <Flashcard
            key={currentCard.id}
            card={currentCard}
            onAdvance={handleAdvance}
            total={allCards.length}
            remaining={queue.length}
            streak={comboCount}
            isBookmarked={bookmarkedCards.includes(currentCard.id)}
            onToggleBookmark={async () => {
              const cardId = currentCard.id;
              const wasBookmarked = bookmarkedCards.includes(cardId);
              // optimistic
              setBookmarkedCards(prev => wasBookmarked ? prev.filter(id => id !== cardId) : [...prev, cardId]);
              try {
                await db.toggleBookmark(cardId, currentCard.english, currentCard.target ?? currentCard.french ?? "", activeLanguage, "level");
              } catch (e) {
                console.error("Failed to toggle bookmark", e);
                // revert
                setBookmarkedCards(prev => wasBookmarked ? [...prev, cardId] : prev.filter(id => id !== cardId));
              }
            }}
            onAnimateAdvance={(fn) => { animateAdvanceRef.current = fn; }}
            bandStyle={currentBandStyle}
            langConfig={langConfig}
          />
        ) : null}
      </div>

      {/* ── Completion result panel (slides up from bottom) ── */}
      {isDeckComplete && selectedLevelId && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
          <div className="w-full max-w-[480px] bg-[#0d2e00] border-t-2 border-[#58cc02]/30 px-5 pt-5 pb-8 animate-result-slide rounded-t-[36px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-[#58cc02]" />
                <div>
                  <p className="text-[#58cc02] font-black text-xl leading-tight">
                    {allCorrectThisSession ? "Perfect!" : "Level done!"}
                  </p>
                  <p className="text-[#58cc02]/50 text-xs font-medium">
                    {allCorrectThisSession
                      ? "Flawless run"
                      : `${failedCards.size} card${failedCards.size !== 1 ? "s" : ""} to review`}
                  </p>
                </div>
              </div>
              <button className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                <Share2 className="w-4 h-4 text-white/30" />
              </button>
            </div>
            <button
              onClick={nextLevel ? handleNextLevel : resetDeck}
              className="w-full h-[52px] rounded-2xl bg-[#58cc02] text-white font-black text-sm tracking-widest uppercase shadow-[0_4px_0_#3e9200] active:shadow-none active:translate-y-1 transition-all"
            >
              {nextLevel ? "Next Level" : "Practice Again"}
            </button>
            {nextLevel && (
              <button
                onClick={resetDeck}
                className="w-full mt-3 py-1.5 text-[#58cc02]/50 text-sm font-semibold"
              >
                Practice again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Word bank — opened from 3-dot menu */}
      {selectedLevelId && !isBookmarkedSession && isWordBankOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsWordBankOpen(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl overflow-hidden animate-slide-up-in"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Word Bank
              </h3>
              <button onClick={() => setIsWordBankOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
              <div className="p-4">
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
            </div>
          </div>
        </div>
      )}

      <NewCollectionModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        onSave={handleSaveCollection}
        editingCollection={editingCollection}
        activeLanguage={activeLanguage}
      />

      {/* ── Home bottom nav ── */}
      {!selectedLevelId && appView === "main" && !isCollectionModalOpen && (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div
            className="w-full flex items-center px-5 gap-3"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.96) 70%)',
              paddingTop: '28px',
              paddingBottom: '20px',
            }}
          >
            {/* + button */}
            <button
              onClick={handleCreateCollection}
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              style={{ background: '#000', border: '1.5px solid rgba(168,85,247,0.6)', boxShadow: '0 0 14px rgba(168,85,247,0.35)' }}
            >
              <Plus className="w-5 h-5 text-white" />
            </button>

            {/* Vocabulary / Phrases tabs */}
            <div className="flex items-center gap-5 flex-1 pl-1">
              {(["vocabulary", "phrases"] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabSwitch(tab)}
                  className={`text-sm font-bold capitalize transition-colors ${
                    activeTab === tab ? "text-white" : "text-white/35"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* User avatar / profile */}
            <button className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <User className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </nav>
      )}


      <NewLevelModal
        isOpen={isNewLevelModalOpen}
        onClose={() => setIsNewLevelModalOpen(false)}
        onSave={handleAddLevel}
        activeLanguage={activeLanguage}
      />
    </div>
  );
}
