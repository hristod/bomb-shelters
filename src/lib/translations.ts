export const translations = {
  bg: {
    title: "Бомбоубежища в България",
    searchPlaceholder: "Търсене по име или адрес...",
    region: "Област",
    type: "Тип",
    category: "Категория",
    allRegions: "Всички области",
    allTypes: "Всички типове",
    allCategories: "Всички категории",
    sheltersFound: "убежища намерени",
    address: "Адрес",
    operator: "Оператор",
    condition: "Състояние",
  },
  en: {
    title: "Bomb Shelters in Bulgaria",
    searchPlaceholder: "Search by name or address...",
    region: "Region",
    type: "Type",
    category: "Category",
    allRegions: "All regions",
    allTypes: "All types",
    allCategories: "All categories",
    sheltersFound: "shelters found",
    address: "Address",
    operator: "Operator",
    condition: "Condition",
  },
} as const;

export type Lang = keyof typeof translations;
export type TranslationKey = keyof typeof translations.bg;
