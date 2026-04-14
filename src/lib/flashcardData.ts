export interface FlashcardItem {
  id: string;
  english: string;
  french: string;
}

export const defaultVocabulary: FlashcardItem[] = [
  { id: "v1", english: "Hello", french: "Bonjour" },
  { id: "v2", english: "Goodbye", french: "Au revoir" },
  { id: "v3", english: "Please", french: "S'il vous plaît" },
  { id: "v4", english: "Thank you", french: "Merci" },
  { id: "v5", english: "Yes", french: "Oui" },
  { id: "v6", english: "No", french: "Non" },
  { id: "v7", english: "Water", french: "L'eau" },
  { id: "v8", english: "Food", french: "La nourriture" },
  { id: "v9", english: "Help", french: "Aide" },
  { id: "v10", english: "Today", french: "Aujourd'hui" },
  { id: "v11", english: "Tomorrow", french: "Demain" },
  { id: "v12", english: "Friend", french: "Ami" },
  { id: "v13", english: "House", french: "Maison" },
  { id: "v14", english: "Work", french: "Travail" },
  { id: "v15", english: "Money", french: "L'argent" },
];

export const defaultPhrases: FlashcardItem[] = [
  { id: "p1", english: "How are you?", french: "Comment allez-vous?" },
  { id: "p2", english: "My name is...", french: "Je m'appelle..." },
  { id: "p3", english: "I don't understand", french: "Je ne comprends pas" },
  { id: "p4", english: "Where is the bathroom?", french: "Où sont les toilettes?" },
  { id: "p5", english: "How much does this cost?", french: "Combien ça coûte?" },
  { id: "p6", english: "I would like...", french: "Je voudrais..." },
  { id: "p7", english: "Speak more slowly please", french: "Parlez plus lentement s'il vous plaît" },
  { id: "p8", english: "I am learning French", french: "J'apprends le français" },
  { id: "p9", english: "Can you help me?", french: "Pouvez-vous m'aider?" },
  { id: "p10", english: "Good morning", french: "Bonjour" },
  { id: "p11", english: "Good night", french: "Bonne nuit" },
  { id: "p12", english: "See you later", french: "À bientôt" },
];
