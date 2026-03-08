export const translations = {
  bg: {
    title: "Бомбоубежища в България",
    address: "Адрес",
    operator: "Оператор",
    type: "Тип",
    condition: "Състояние",
    reportProblem: "Сигнал за грешка",
    navigateToNearest: "Най-близко убежище",
    locationRequired: "Необходим е достъп до местоположението, за да намерим най-близкото убежище.",
    locationUnavailable: "Местоположението не е налично. Моля, опитайте отново.",
  },
  en: {
    title: "Bomb Shelters in Bulgaria",
    address: "Address",
    operator: "Operator",
    type: "Type",
    condition: "Condition",
    reportProblem: "Report a problem",
    navigateToNearest: "Nearest shelter",
    locationRequired: "Location access is required to find the nearest shelter.",
    locationUnavailable: "Location unavailable. Please try again.",
  },
} as const;

export type Lang = keyof typeof translations;
export type TranslationKey = keyof typeof translations.bg;
