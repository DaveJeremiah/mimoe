export interface FlashcardItem {
  id: string;
  english: string;
  french: string;
  /** Additional accepted French answers (synonyms/alternatives) */
  alternatives?: string[];
}

export interface Level {
  id: string;
  title: string;
  cards: FlashcardItem[];
}

export const vocabularyLevels: Level[] = [
  {
    id: "vocab-1",
    title: "Greetings",
    cards: [
      { id: "v1", english: "Hello", french: "Bonjour" },
      { id: "v2", english: "Goodbye", french: "Au revoir" },
      { id: "v3", english: "Yes", french: "Oui" },
      { id: "v4", english: "No", french: "Non" },
      { id: "v5", english: "Thank you", french: "Merci" },
      { id: "v6", english: "Welcome", french: "Bienvenue" },
      { id: "v7", english: "Good evening", french: "Bonsoir" },
      { id: "v8", english: "Sir", french: "Monsieur" },
      { id: "v9", english: "Madam", french: "Madame" },
      { id: "v10", english: "Miss", french: "Mademoiselle" },
      { id: "v11", english: "Excuse me", french: "Excusez-moi" },
      { id: "v12", english: "Sorry", french: "Pardon" },
      { id: "v13", english: "Of course", french: "Bien sûr" },
      { id: "v14", english: "Hi", french: "Salut" },
      { id: "v15", english: "See you soon", french: "À bientôt" },
    ],
  },
  {
    id: "vocab-2",
    title: "Essentials",
    cards: [
      { id: "v16", english: "Please", french: "S'il vous plaît" },
      { id: "v17", english: "Water", french: "L'eau" },
      { id: "v18", english: "Help", french: "Aide" },
      { id: "v19", english: "Friend", french: "Ami" },
      { id: "v20", english: "Tomorrow", french: "Demain" },
      { id: "v21", english: "Today", french: "Aujourd'hui" },
      { id: "v22", english: "Yesterday", french: "Hier" },
      { id: "v23", english: "Night", french: "Nuit" },
      { id: "v24", english: "Day", french: "Jour" },
      { id: "v25", english: "Morning", french: "Matin" },
      { id: "v26", english: "Afternoon", french: "Après-midi" },
      { id: "v27", english: "Time", french: "Le temps" },
      { id: "v28", english: "Now", french: "Maintenant" },
      { id: "v29", english: "Here", french: "Ici" },
      { id: "v30", english: "There", french: "Là-bas" },
    ],
  },
  {
    id: "vocab-3",
    title: "Daily Life",
    cards: [
      { id: "v31", english: "House", french: "Maison" },
      { id: "v32", english: "Work", french: "Travail" },
      { id: "v33", english: "Money", french: "L'argent" },
      { id: "v34", english: "Food", french: "La nourriture" },
      { id: "v35", english: "Bread", french: "Le pain" },
      { id: "v36", english: "Milk", french: "Le lait" },
      { id: "v37", english: "Coffee", french: "Le café" },
      { id: "v38", english: "Tea", french: "Le thé" },
      { id: "v39", english: "Cheese", french: "Le fromage" },
      { id: "v40", english: "Meat", french: "La viande" },
      { id: "v41", english: "Fruit", french: "Le fruit" },
      { id: "v42", english: "Vegetable", french: "Le légume" },
      { id: "v43", english: "Restaurant", french: "Le restaurant" },
      { id: "v44", english: "Store", french: "Le magasin" },
      { id: "v45", english: "Street", french: "La rue" },
    ],
  },
];

export const phraseLevels: Level[] = [
  {
    id: "phrase-1",
    title: "Basics",
    cards: [
      { id: "p1", english: "How are you?", french: "Comment allez-vous?" },
      { id: "p2", english: "My name is...", french: "Je m'appelle..." },
      { id: "p3", english: "Good morning", french: "Bonjour" },
      { id: "p4", english: "Good night", french: "Bonne nuit" },
      { id: "p5", english: "I am fine", french: "Je vais bien" },
      { id: "p6", english: "And you?", french: "Et vous?" },
      { id: "p7", english: "Nice to meet you", french: "Enchanté" },
      { id: "p8", english: "How's it going?", french: "Comment ça va?" },
      { id: "p9", english: "I'm doing well", french: "Ça va bien" },
      { id: "p10", english: "See you tomorrow", french: "À demain" },
      { id: "p11", english: "Have a good day", french: "Bonne journée" },
      { id: "p12", english: "Have a good evening", french: "Bonne soirée" },
      { id: "p13", english: "Thank you very much", french: "Merci beaucoup" },
      { id: "p14", english: "You're welcome", french: "De rien" },
      { id: "p15", english: "No problem", french: "Pas de problème" },
    ],
  },
  {
    id: "phrase-2",
    title: "Getting Around",
    cards: [
      { id: "p16", english: "Where is the bathroom?", french: "Où sont les toilettes?" },
      { id: "p17", english: "How much does this cost?", french: "Combien ça coûte?" },
      { id: "p18", english: "I would like...", french: "Je voudrais..." },
      { id: "p19", english: "See you later", french: "À bientôt" },
      { id: "p20", english: "Where is...?", french: "Où est...?" },
      { id: "p21", english: "Turn left", french: "Tournez à gauche" },
      { id: "p22", english: "Turn right", french: "Tournez à droite" },
      { id: "p23", english: "Go straight", french: "Allez tout droit" },
      { id: "p24", english: "I am lost", french: "Je suis perdu" },
      { id: "p25", english: "The train station", french: "La gare" },
      { id: "p26", english: "The airport", french: "L'aéroport" },
      { id: "p27", english: "A ticket please", french: "Un billet s'il vous plaît" },
      { id: "p28", english: "The check please", french: "L'addition s'il vous plaît" },
      { id: "p29", english: "I need help", french: "J'ai besoin d'aide" },
      { id: "p30", english: "Is it far?", french: "C'est loin?" },
    ],
  },
  {
    id: "phrase-3",
    title: "Conversations",
    cards: [
      { id: "p31", english: "I don't understand", french: "Je ne comprends pas" },
      { id: "p32", english: "Speak more slowly please", french: "Parlez plus lentement s'il vous plaît" },
      { id: "p33", english: "I am learning French", french: "J'apprends le français" },
      { id: "p34", english: "Can you help me?", french: "Pouvez-vous m'aider?" },
      { id: "p35", english: "Do you speak English?", french: "Parlez-vous anglais?" },
      { id: "p36", english: "I speak a little French", french: "Je parle un peu français" },
      { id: "p37", english: "Can you repeat?", french: "Pouvez-vous répéter?" },
      { id: "p38", english: "What does that mean?", french: "Qu'est-ce que ça veut dire?" },
      { id: "p39", english: "I don't know", french: "Je ne sais pas" },
      { id: "p40", english: "I think so", french: "Je pense que oui" },
      { id: "p41", english: "That's great", french: "C'est super" },
      { id: "p42", english: "I agree", french: "Je suis d'accord" },
      { id: "p43", english: "What time is it?", french: "Quelle heure est-il?" },
      { id: "p44", english: "I'm hungry", french: "J'ai faim" },
      { id: "p45", english: "I'm tired", french: "Je suis fatigué" },
    ],
  },
];
