export interface FlashcardItem {
  id: string;
  english: string;
  french?: string;
  arabic?: string;
  target: string;
  alternatives?: string[];
  dialect?: string;
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
      { id: "v1", english: "Hello", french: "Bonjour", target: "Bonjour" },
      { id: "v2", english: "Goodbye", french: "Au revoir", target: "Au revoir" },
      { id: "v3", english: "Yes", french: "Oui", target: "Oui" },
      { id: "v4", english: "No", french: "Non", target: "Non" },
      { id: "v5", english: "Thank you", french: "Merci", target: "Merci" },
      { id: "v6", english: "Welcome", french: "Bienvenue", target: "Bienvenue" },
      { id: "v7", english: "Good evening", french: "Bonsoir", target: "Bonsoir" },
      { id: "v8", english: "Sir", french: "Monsieur", target: "Monsieur" },
      { id: "v9", english: "Madam", french: "Madame", target: "Madame" },
      { id: "v10", english: "Miss", french: "Mademoiselle", target: "Mademoiselle" },
      { id: "v11", english: "Excuse me", french: "Excusez-moi", target: "Excusez-moi" },
      { id: "v12", english: "Sorry", french: "Pardon", target: "Pardon" },
      { id: "v13", english: "Of course", french: "Bien sûr", target: "Bien sûr" },
      { id: "v14", english: "Hi", french: "Salut", target: "Salut" },
      { id: "v15", english: "See you soon", french: "À bientôt", target: "À bientôt" },
    ],
  },
  {
    id: "vocab-2",
    title: "Essentials",
    cards: [
      { id: "v16", english: "Please", french: "S'il vous plaît", target: "S'il vous plaît" },
      { id: "v17", english: "Water", french: "L'eau", target: "L'eau" },
      { id: "v18", english: "Help", french: "Aide", target: "Aide" },
      { id: "v19", english: "Friend", french: "Ami", target: "Ami" },
      { id: "v20", english: "Tomorrow", french: "Demain", target: "Demain" },
      { id: "v21", english: "Today", french: "Aujourd'hui", target: "Aujourd'hui" },
      { id: "v22", english: "Yesterday", french: "Hier", target: "Hier" },
      { id: "v23", english: "Night", french: "Nuit", target: "Nuit" },
      { id: "v24", english: "Day", french: "Jour", target: "Jour" },
      { id: "v25", english: "Morning", french: "Matin", target: "Matin" },
      { id: "v26", english: "Afternoon", french: "Après-midi", target: "Après-midi" },
      { id: "v27", english: "Time", french: "Le temps", target: "Le temps" },
      { id: "v28", english: "Now", french: "Maintenant", target: "Maintenant" },
      { id: "v29", english: "Here", french: "Ici", target: "Ici" },
      { id: "v30", english: "There", french: "Là-bas", target: "Là-bas" },
    ],
  },
  {
    id: "vocab-3",
    title: "Daily Life",
    cards: [
      { id: "v31", english: "House", french: "Maison", target: "Maison" },
      { id: "v32", english: "Work", french: "Travail", target: "Travail" },
      { id: "v33", english: "Money", french: "L'argent", target: "L'argent" },
      { id: "v34", english: "Food", french: "La nourriture", target: "La nourriture" },
      { id: "v35", english: "Bread", french: "Le pain", target: "Le pain" },
      { id: "v36", english: "Milk", french: "Le lait", target: "Le lait" },
      { id: "v37", english: "Coffee", french: "Le café", target: "Le café" },
      { id: "v38", english: "Tea", french: "Le thé", target: "Le thé" },
      { id: "v39", english: "Cheese", french: "Le fromage", target: "Le fromage" },
      { id: "v40", english: "Meat", french: "La viande", target: "La viande" },
      { id: "v41", english: "Fruit", french: "Le fruit", target: "Le fruit" },
      { id: "v42", english: "Vegetable", french: "Le légume", target: "Le légume" },
      { id: "v43", english: "Restaurant", french: "Le restaurant", target: "Le restaurant" },
      { id: "v44", english: "Store", french: "Le magasin", target: "Le magasin" },
      { id: "v45", english: "Street", french: "La rue", target: "La rue" },
    ],
  },
];

export const phraseLevels: Level[] = [
  {
    id: "phrase-1",
    title: "Basics",
    cards: [
      { id: "p1", english: "How are you?", french: "Comment allez-vous?", target: "Comment allez-vous?" },
      { id: "p2", english: "My name is...", french: "Je m'appelle...", target: "Je m'appelle..." },
      { id: "p3", english: "Good morning", french: "Bonjour", target: "Bonjour" },
      { id: "p4", english: "Good night", french: "Bonne nuit", target: "Bonne nuit" },
      { id: "p5", english: "I am fine", french: "Je vais bien", target: "Je vais bien" },
      { id: "p6", english: "And you?", french: "Et vous?", target: "Et vous?" },
      { id: "p7", english: "Nice to meet you", french: "Enchanté", target: "Enchanté" },
      { id: "p8", english: "How's it going?", french: "Comment ça va?", target: "Comment ça va?" },
      { id: "p9", english: "I'm doing well", french: "Ça va bien", target: "Ça va bien" },
      { id: "p10", english: "See you tomorrow", french: "À demain", target: "À demain" },
      { id: "p11", english: "Have a good day", french: "Bonne journée", target: "Bonne journée" },
      { id: "p12", english: "Have a good evening", french: "Bonne soirée", target: "Bonne soirée" },
      { id: "p13", english: "Thank you very much", french: "Merci beaucoup", target: "Merci beaucoup" },
      { id: "p14", english: "You're welcome", french: "De rien", target: "De rien" },
      { id: "p15", english: "No problem", french: "Pas de problème", target: "Pas de problème" },
    ],
  },
  {
    id: "phrase-2",
    title: "Getting Around",
    cards: [
      { id: "p16", english: "Where is the bathroom?", french: "Où sont les toilettes?", target: "Où sont les toilettes?" },
      { id: "p17", english: "How much does this cost?", french: "Combien ça coûte?", target: "Combien ça coûte?" },
      { id: "p18", english: "I would like...", french: "Je voudrais...", target: "Je voudrais..." },
      { id: "p19", english: "See you later", french: "À bientôt", target: "À bientôt" },
      { id: "p20", english: "Where is...?", french: "Où est...?", target: "Où est...?" },
      { id: "p21", english: "Turn left", french: "Tournez à gauche", target: "Tournez à gauche" },
      { id: "p22", english: "Turn right", french: "Tournez à droite", target: "Tournez à droite" },
      { id: "p23", english: "Go straight", french: "Allez tout droit", target: "Allez tout droit" },
      { id: "p24", english: "I am lost", french: "Je suis perdu", target: "Je suis perdu" },
      { id: "p25", english: "The train station", french: "La gare", target: "La gare" },
      { id: "p26", english: "The airport", french: "L'aéroport", target: "L'aéroport" },
      { id: "p27", english: "A ticket please", french: "Un billet s'il vous plaît", target: "Un billet s'il vous plaît" },
      { id: "p28", english: "The check please", french: "L'addition s'il vous plaît", target: "L'addition s'il vous plaît" },
      { id: "p29", english: "I need help", french: "J'ai besoin d'aide", target: "J'ai besoin d'aide" },
      { id: "p30", english: "Is it far?", french: "C'est loin?", target: "C'est loin?" },
    ],
  },
  {
    id: "phrase-3",
    title: "Conversations",
    cards: [
      { id: "p31", english: "I don't understand", french: "Je ne comprends pas", target: "Je ne comprends pas" },
      { id: "p32", english: "Speak more slowly please", french: "Parlez plus lentement s'il vous plaît", target: "Parlez plus lentement s'il vous plaît" },
      { id: "p33", english: "I am learning French", french: "J'apprends le français", target: "J'apprends le français" },
      { id: "p34", english: "Can you help me?", french: "Pouvez-vous m'aider?", target: "Pouvez-vous m'aider?" },
      { id: "p35", english: "Do you speak English?", french: "Parlez-vous anglais?", target: "Parlez-vous anglais?" },
      { id: "p36", english: "I speak a little French", french: "Je parle un peu français", target: "Je parle un peu français" },
      { id: "p37", english: "Can you repeat?", french: "Pouvez-vous répéter?", target: "Pouvez-vous répéter?" },
      { id: "p38", english: "What does that mean?", french: "Qu'est-ce que ça veut dire?", target: "Qu'est-ce que ça veut dire?" },
      { id: "p39", english: "I don't know", french: "Je ne sais pas", target: "Je ne sais pas" },
      { id: "p40", english: "I think so", french: "Je pense que oui", target: "Je pense que oui" },
      { id: "p41", english: "That's great", french: "C'est super", target: "C'est super" },
      { id: "p42", english: "I agree", french: "Je suis d'accord", target: "Je suis d'accord" },
      { id: "p43", english: "What time is it?", french: "Quelle heure est-il?", target: "Quelle heure est-il?" },
      { id: "p44", english: "I'm hungry", french: "J'ai faim", target: "J'ai faim" },
      { id: "p45", english: "I'm tired", french: "Je suis fatigué", target: "Je suis fatigué" },
    ],
  },
];

export const arabicVocabularyLevels: Level[] = [
  {
    id: "ar-vocab-1",
    title: "Greetings",
    cards: [
      { id: "ar-v1", english: "Hello", arabic: "مرحبا", target: "مرحبا" },
      { id: "ar-v2", english: "Goodbye", arabic: "مع السلامة", target: "مع السلامة" },
      { id: "ar-v3", english: "Yes", arabic: "نعم", target: "نعم" },
      { id: "ar-v4", english: "No", arabic: "لا", target: "لا" },
      { id: "ar-v5", english: "Thank you", arabic: "شكرا", target: "شكرا" },
      { id: "ar-v6", english: "Welcome", arabic: "أهلا وسهلا", target: "أهلا وسهلا" },
      { id: "ar-v7", english: "Good morning", arabic: "صباح الخير", target: "صباح الخير" },
      { id: "ar-v8", english: "Good evening", arabic: "مساء الخير", target: "مساء الخير" },
      { id: "ar-v9", english: "Good night", arabic: "تصبح على خير", target: "تصبح على خير" },
      { id: "ar-v10", english: "Please", arabic: "من فضلك", target: "من فضلك" },
      { id: "ar-v11", english: "Sorry", arabic: "آسف", target: "آسف" },
      { id: "ar-v12", english: "Excuse me", arabic: "عفوا", target: "عفوا" },
      { id: "ar-v13", english: "How are you?", arabic: "كيف حالك", target: "كيف حالك" },
      { id: "ar-v14", english: "Fine", arabic: "بخير", target: "بخير" },
      { id: "ar-v15", english: "My name is", arabic: "اسمي", target: "اسمي" },
    ],
  },
  {
    id: "ar-vocab-2",
    title: "Essentials",
    cards: [
      { id: "ar-v16", english: "Water", arabic: "ماء", target: "ماء" },
      { id: "ar-v17", english: "Food", arabic: "طعام", target: "طعام" },
      { id: "ar-v18", english: "House", arabic: "بيت", target: "بيت" },
      { id: "ar-v19", english: "Work", arabic: "عمل", target: "عمل" },
      { id: "ar-v20", english: "Friend", arabic: "صديق", target: "صديق" },
      { id: "ar-v21", english: "Family", arabic: "عائلة", target: "عائلة" },
      { id: "ar-v22", english: "Money", arabic: "مال", target: "مال" },
      { id: "ar-v23", english: "Time", arabic: "وقت", target: "وقت" },
      { id: "ar-v24", english: "Day", arabic: "يوم", target: "يوم" },
      { id: "ar-v25", english: "Night", arabic: "ليل", target: "ليل" },
      { id: "ar-v26", english: "Today", arabic: "اليوم", target: "اليوم" },
      { id: "ar-v27", english: "Tomorrow", arabic: "غدا", target: "غدا" },
      { id: "ar-v28", english: "Help", arabic: "مساعدة", target: "مساعدة" },
      { id: "ar-v29", english: "School", arabic: "مدرسة", target: "مدرسة" },
      { id: "ar-v30", english: "City", arabic: "مدينة", target: "مدينة" },
    ],
  },
  {
    id: "ar-vocab-3",
    title: "Numbers",
    cards: [
      { id: "ar-v31", english: "One", arabic: "واحد", target: "واحد" },
      { id: "ar-v32", english: "Two", arabic: "اثنان", target: "اثنان" },
      { id: "ar-v33", english: "Three", arabic: "ثلاثة", target: "ثلاثة" },
      { id: "ar-v34", english: "Four", arabic: "أربعة", target: "أربعة" },
      { id: "ar-v35", english: "Five", arabic: "خمسة", target: "خمسة" },
      { id: "ar-v36", english: "Six", arabic: "ستة", target: "ستة" },
      { id: "ar-v37", english: "Seven", arabic: "سبعة", target: "سبعة" },
      { id: "ar-v38", english: "Eight", arabic: "ثمانية", target: "ثمانية" },
      { id: "ar-v39", english: "Nine", arabic: "تسعة", target: "تسعة" },
      { id: "ar-v40", english: "Ten", arabic: "عشرة", target: "عشرة" },
    ],
  },
];

export const arabicPhraseLevels: Level[] = [
  {
    id: "ar-phrase-1",
    title: "Introductions",
    cards: [
      { id: "ar-p1", english: "What is your name?", arabic: "ما اسمك؟", target: "ما اسمك؟" },
      { id: "ar-p2", english: "Where are you from?", arabic: "من أين أنت؟", target: "من أين أنت؟" },
      { id: "ar-p3", english: "I am from...", arabic: "أنا من", target: "أنا من" },
      { id: "ar-p4", english: "Nice to meet you", arabic: "تشرفت بمعرفتك", target: "تشرفت بمعرفتك" },
      { id: "ar-p5", english: "I speak a little Arabic", arabic: "أتكلم قليلا من العربية", target: "أتكلم قليلا من العربية" },
      { id: "ar-p6", english: "I am learning Arabic", arabic: "أتعلم العربية", target: "أتعلم العربية" },
    ],
  },
  {
    id: "ar-phrase-2",
    title: "Getting Around",
    cards: [
      { id: "ar-p7", english: "Where is the bathroom?", arabic: "أين الحمام؟", target: "أين الحمام؟" },
      { id: "ar-p8", english: "How much does this cost?", arabic: "كم يكلف هذا؟", target: "كم يكلف هذا؟" },
      { id: "ar-p9", english: "I don't understand", arabic: "لا أفهم", target: "لا أفهم" },
      { id: "ar-p10", english: "Can you help me?", arabic: "هل يمكنك مساعدتي؟", target: "هل يمكنك مساعدتي؟" },
      { id: "ar-p11", english: "Speak slowly please", arabic: "تكلم ببطء من فضلك", target: "تكلم ببطء من فضلك" },
      { id: "ar-p12", english: "I would like...", arabic: "أريد", target: "أريد" },
      { id: "ar-p13", english: "Where is the hotel?", arabic: "أين الفندق؟", target: "أين الفندق؟" },
    ],
  },
];
