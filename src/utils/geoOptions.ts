import type { TranslationKey } from '../i18n/en';

// Shared Country / Nationality option lists, used by both the new-account
// registration form and the user-detail edit form so the two stay in sync.
// Same country set/order as the phone country-code selector in
// MobileAppNewUserForm.tsx.
//
// Labels are resolved through the active language's t() at call time —
// see the note in formOptions.ts for why nothing here is a fixed string.

export interface DropdownOption {
  value: string;
  label: string;
}

type T = (key: TranslationKey | string, vars?: Record<string, string | number>) => string;

function buildOptions(t: T, prefix: string, values: string[]): DropdownOption[] {
  return [
    { value: '', label: t(`${prefix}.blank`) },
    ...values.map((value) => ({ value, label: t(`${prefix}.${value}`) })),
  ];
}

export const COUNTRY_VALUES = [
  'Bangladesh',
  'India',
  'United States',
  'United Kingdom',
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Oman',
  'Bahrain',
  'Malaysia',
  'Singapore',
  'Japan',
  'South Korea',
  'China',
  'Germany',
  'France',
  'Italy',
  'Russia',
  'Brazil',
  'South Africa',
  'Australia',
  'New Zealand',
  'Pakistan',
  'Sri Lanka',
  'Nepal',
  'Egypt',
  'Nigeria',
  'Kenya',
  'Morocco',
];

export const getCountries = (t: T): DropdownOption[] => buildOptions(t, 'option.country', COUNTRY_VALUES);

export const NATIONALITY_VALUES = [
  'Bangladeshi',
  'Indian',
  'American',
  'British',
  'Emirati',
  'Saudi',
  'Qatari',
  'Kuwaiti',
  'Omani',
  'Bahraini',
  'Malaysian',
  'Singaporean',
  'Japanese',
  'South Korean',
  'Chinese',
  'German',
  'French',
  'Italian',
  'Russian',
  'Brazilian',
  'South African',
  'Australian',
  'New Zealander',
  'Pakistani',
  'Sri Lankan',
  'Nepali',
  'Egyptian',
  'Nigerian',
  'Kenyan',
  'Moroccan',
];

export const getNationalities = (t: T): DropdownOption[] => buildOptions(t, 'option.nationality', NATIONALITY_VALUES);
