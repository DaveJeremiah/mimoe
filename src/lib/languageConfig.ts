export type Language = "french" | "arabic";

export interface ArabicDialect {
  code: string;
  label: string;
  flag: string;
  sttLang: string;
  ttsVoice: string;
}

export const ARABIC_DIALECTS: ArabicDialect[] = [
  { code: "ar-SA", label: "Modern Standard (MSA)", flag: "🇸🇦", sttLang: "ar-SA", ttsVoice: "ar-SA-ZariyahNeural" },
  { code: "ar-EG", label: "Egyptian", flag: "🇪🇬", sttLang: "ar-EG", ttsVoice: "ar-EG-SalmaNeural" },
  { code: "ar-LB", label: "Levantine", flag: "🇱🇧", sttLang: "ar-LB", ttsVoice: "ar-LB-LaylaNeural" },
  { code: "ar-KW", label: "Gulf", flag: "🇰🇼", sttLang: "ar-KW", ttsVoice: "ar-KW-FahedNeural" },
  { code: "ar-MA", label: "Moroccan", flag: "🇲🇦", sttLang: "ar-MA", ttsVoice: "ar-MA-MounaNeural" },
  { code: "ar-IQ", label: "Iraqi", flag: "🇮🇶", sttLang: "ar-IQ", ttsVoice: "ar-IQ-BasselNeural" },
];

export interface LanguageConfig {
  code: Language;
  label: string;
  flag: string;
  ttsLang: string;
  ttsVoice: string;
  sttLang: string;
  rtl: boolean;
  fontClass: string;
  cachePrefix: string;
}

export const LANGUAGE_CONFIGS: Record<Language, LanguageConfig> = {
  french: {
    code: "french",
    label: "French",
    flag: "🇫🇷",
    ttsLang: "fr-FR",
    ttsVoice: "fr-FR-DeniseNeural",
    sttLang: "fr-FR",
    rtl: false,
    fontClass: "",
    cachePrefix: "tts_az_fr_",
  },
  arabic: {
    code: "arabic",
    label: "Arabic",
    flag: "🇸🇦",
    ttsLang: "ar-SA",
    ttsVoice: "ar-SA-ZariyahNeural",
    sttLang: "ar-SA",
    rtl: true,
    fontClass: "font-arabic",
    cachePrefix: "tts_az_ar_",
  },
};

export function getArabicConfigForDialect(dialectCode: string): LanguageConfig {
  const dialect = ARABIC_DIALECTS.find(d => d.code === dialectCode) ?? ARABIC_DIALECTS[0];
  return {
    ...LANGUAGE_CONFIGS.arabic,
    ttsLang: dialect.sttLang,
    ttsVoice: dialect.ttsVoice,
    sttLang: dialect.sttLang,
    cachePrefix: `tts_az_${dialect.code.toLowerCase().replace("-", "_")}_`,
  };
}
