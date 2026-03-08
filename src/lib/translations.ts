export const translations = {
  bg: {
    title: "Бомбоубежища в България",
    address: "Адрес",
    operator: "Оператор",
    type: "Тип",
    condition: "Състояние",
    reportProblem: "Сигнал за грешка",
    navigateToShelter: "Навигирай до най-близкото убежище",
    locationRequired: "Достъпът до местоположението е необходим, за да намерите най-близкото убежище.",
    locating: "Определяне на местоположение...",
  },
  en: {
    title: "Bomb Shelters in Bulgaria",
    address: "Address",
    operator: "Operator",
    type: "Type",
    condition: "Condition",
    reportProblem: "Report a problem",
    navigateToShelter: "Navigate to closest shelter",
    locationRequired: "Location access is required to find the closest shelter.",
    locating: "Locating...",
  },
} as const;

export type Lang = keyof typeof translations;
export type TranslationKey = keyof typeof translations.bg;
