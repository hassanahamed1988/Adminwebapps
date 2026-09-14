import type { TranslationKey } from '../i18n/en';

// Shared dropdown option lists used by the registration forms (mobile-app
// user form and admin form) so both stay in sync on the same choices.
//
// IMPORTANT: every label here is resolved through the active language's
// translation function (t), passed in by the caller — never a hardcoded
// string. This is what the "no mixed-language content" rule actually
// requires: a Bengali-labeled option is meaningless once the user switches
// to English, so nothing here may bake in a fixed-language string. Adding
// a new option = adding one `option.<group>.<value>` key to en.ts/bn.ts,
// nothing else — no per-page language logic.

export interface Option {
  value: string;
  label: string;
}

type T = (key: TranslationKey | string, vars?: Record<string, string | number>) => string;

function buildOptions(t: T, prefix: string, values: string[]): Option[] {
  return [
    { value: '', label: t(`${prefix}.blank`) },
    ...values.map((value) => ({ value, label: t(`${prefix}.${value}`) })),
  ];
}

export const getGenders = (t: T): Option[] => buildOptions(t, 'option.gender', ['Male', 'Female', 'Other']);

export const getReligions = (t: T): Option[] =>
  buildOptions(t, 'option.religion', ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Judaism', 'Sikhism', 'Other']);

export const getProfessions = (t: T): Option[] =>
  buildOptions(t, 'option.profession', [
    'Student', 'Service', 'Business', 'Doctor', 'Engineer', 'Teacher', 'Lawyer',
    'Farmer', 'Driver', 'Worker', 'Freelancer', 'Housewife', 'Retired', 'Other',
  ]);

const DOCUMENT_TYPE_VALUES = ['National ID', 'Passport', 'Birth Registration Number', 'Visa Number', 'Residency Number'];

export const getDocumentTypes = (t: T): Option[] => buildOptions(t, 'option.documentType', DOCUMENT_TYPE_VALUES);

/**
 * Dynamic label for the ID-number field, driven by the selected Document
 * Type — "National ID" → "National ID Number", "Passport" → "Passport
 * Number", etc. Each combination has its own translation key (rather than
 * being built by string concatenation) since "<type> Number" doesn't
 * translate as a simple suffix in every language. Falls back to a generic
 * label before any type is chosen.
 */
export function documentNumberLabel(t: T, idType: string): string {
  if (!idType || !DOCUMENT_TYPE_VALUES.includes(idType)) return t('field.docNumberLabel.default');
  return t(`field.docNumberLabel.${idType}`);
}

/* ═══════════════════ Mobile number validation ═══════════════════
   Digits-only check for the number typed after the country-code
   selector. BD (+880) gets the real local-mobile shape (10 digits,
   starting 1[3-9] — i.e. 01XXXXXXXXX without the leading 0). Every
   other country code gets a generic 7–14 digit sanity check, since
   modeling exact per-country phone rules isn't practical here.
   Returns a translation key (or ''), never literal text — callers
   resolve it through t() so the message follows the active language. */
export function validateMobileNumber(countryCode: string, rawNumber: string): string {
  const number = rawNumber.trim();
  if (!number) return 'validation.mobileRequired';
  if (!/^\d+$/.test(number)) return 'validation.mobileDigitsOnly';

  if (countryCode === '+880') {
    if (!/^1[3-9]\d{8}$/.test(number)) {
      return 'validation.mobileBdInvalid';
    }
    return '';
  }

  if (number.length < 7 || number.length > 14) {
    return 'validation.mobileGenericInvalid';
  }
  return '';
}

/* ═══════════════════ Document / ID number validation ═══════════════════
   One pattern per document type, based on the common real-world shape of
   each document. */
const DOCUMENT_NUMBER_PATTERNS: Record<string, { regex: RegExp; hint: string }> = {
  'National ID': {
    regex: /^\d{10}$|^\d{13}$|^\d{17}$/,
    hint: 'validation.nationalIdInvalid',
  },
  'Passport': {
    regex: /^[A-Za-z][A-Za-z0-9]{5,8}$/,
    hint: 'validation.passportInvalid',
  },
  'Birth Registration Number': {
    regex: /^\d{17}$/,
    hint: 'validation.birthRegInvalid',
  },
  'Visa Number': {
    regex: /^[A-Za-z0-9-]{5,15}$/,
    hint: 'validation.visaInvalid',
  },
  'Residency Number': {
    regex: /^[A-Za-z0-9-]{5,15}$/,
    hint: 'validation.residencyInvalid',
  },
};

export function validateDocumentNumber(idType: string, rawNumber: string): string {
  const number = rawNumber.trim();
  if (!idType) return 'validation.selectDocumentType';
  if (!number) return 'validation.documentNumberRequired';

  const pattern = DOCUMENT_NUMBER_PATTERNS[idType];
  if (pattern && !pattern.regex.test(number)) {
    return pattern.hint;
  }
  return '';
}

export const getDurations = (t: T): Option[] => [
  { value: '1 MONTH', label: t('option.duration.1 MONTH') },
  { value: '3 MONTHS', label: t('option.duration.3 MONTHS') },
  { value: '6 MONTHS', label: t('option.duration.6 MONTHS') },
  { value: '1 YEAR', label: t('option.duration.1 YEAR') },
  { value: 'LIFETIME', label: t('option.duration.LIFETIME') },
];

/** Payment method choices for the Subscription step. Selecting a method
 * changes which fields appear below it (see getPaymentFieldLabels). */
export const getPaymentMethods = (t: T): Option[] =>
  buildOptions(t, 'option.paymentMethod', ['BANK_TRANSFER', 'CASH', 'CHEQUE']);

/** Discount choices for the Subscription step — applied against the
 *  package price before it flows into the Payment Info step's preview
 *  and default paid amount. */
export const getDiscountTypes = (t: T): Option[] =>
  buildOptions(t, 'option.discountType', ['PERCENTAGE', 'FLAT']);

/**
 * Computes the payable amount after discount. Returns the original price
 * (rounded, floored at 0) when no discount type/value is set or the
 * inputs don't parse — callers should treat that as "no discount applied".
 */
export function computeDiscountedPrice(price: string, discountType: string, discountValue: string): number {
  const base = Number(price) || 0;
  const value = Number(discountValue) || 0;
  if (!discountType || !value) return base;
  const discountAmount = discountType === 'PERCENTAGE' ? (base * value) / 100 : value;
  return Math.max(0, base - discountAmount);
}

/** Dynamic field labels shown under the payment-method selector.
 *   - BANK_TRANSFER → Bank Name, Account Holder Name, Account Number
 *   - CHEQUE        → Bank Name, Cheque Number
 *   - CASH          → no extra fields needed
 */
export function getPaymentFieldLabels(
  t: T
): Record<string, { bankName?: string; holderName?: string; accountOrCheque?: string }> {
  return {
    BANK_TRANSFER: {
      bankName: t('field.payment.bankName'),
      holderName: t('field.payment.holderName'),
      accountOrCheque: t('field.payment.accountNumber'),
    },
    CHEQUE: {
      bankName: t('field.payment.bankName'),
      accountOrCheque: t('field.payment.chequeNumber'),
    },
  };
}

const BANK_VALUES = [
  'Sonali Bank', 'Janata Bank', 'Agrani Bank', 'Rupali Bank', 'Bangladesh Krishi Bank',
  'BRAC Bank', 'Dutch-Bangla Bank', 'Eastern Bank', 'City Bank', 'Prime Bank',
  'Southeast Bank', 'Mutual Trust Bank', 'Uttara Bank', 'Pubali Bank', 'IFIC Bank',
  'NCC Bank', 'Standard Chartered', 'HSBC', 'Islami Bank Bangladesh', 'Al-Arafah Islami Bank',
  'Social Islami Bank', 'Union Bank', 'NRB Bank', 'Bank Asia', 'Trust Bank',
  'Jamuna Bank', 'Midland Bank', 'Modhumoti Bank', 'Meghna Bank', 'Shimanto Bank', 'Other',
];

export const getBankNames = (t: T): Option[] => buildOptions(t, 'option.bank', BANK_VALUES);

/* ═══════════════════ Payment History → Add Transaction payment fields ═══
   A separate method list + field config from getPaymentMethods/
   getPaymentFieldLabels above — those two feed the registration Subscription
   step and must stay exactly as they are (CHEQUE has no Mobile Banking
   option there, no Branch Name / Received By fields, etc.). Add Transaction
   needs a richer, independently-evolving set, so it gets its own functions
   here rather than changing the shared ones underneath the older forms. */

export const getTransactionPaymentMethods = (t: T): Option[] =>
  buildOptions(t, 'paymentHistory.method', ['BANK_TRANSFER', 'MOBILE_BANKING', 'CASH', 'CHEQUE']);

const MOBILE_BANKING_PROVIDER_VALUES = ['bKash', 'Nagad', 'Rocket', 'Upay', 'SureCash', 'mCash', 'Other'];

export const getMobileBankingProviders = (t: T): Option[] =>
  buildOptions(t, 'option.mobileBankingProvider', MOBILE_BANKING_PROVIDER_VALUES);

export interface TransactionPaymentFieldDef {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'select';
  /** Only present when type === 'select'. */
  options?: Option[];
  required?: boolean;
}

/**
 * Method-specific fields shown in the Add Transaction form once a Payment
 * Method is selected — only the fields relevant to that method are shown.
 * Adding a new payment method later means adding one more entry to this map
 * (plus its translation keys); no other code needs to change.
 */
export function getTransactionPaymentFields(t: T): Record<string, TransactionPaymentFieldDef[]> {
  return {
    BANK_TRANSFER: [
      { key: 'bankName', label: t('paymentHistory.field.bankName'), type: 'select', options: getBankNames(t) },
      { key: 'branchName', label: t('paymentHistory.field.branchName') },
      { key: 'accountHolderName', label: t('paymentHistory.field.accountHolderName') },
      { key: 'accountNumber', label: t('paymentHistory.field.accountNumber') },
      { key: 'transactionRef', label: t('paymentHistory.field.transactionRef') },
      { key: 'paymentDate', label: t('paymentHistory.field.paymentDate'), type: 'date' },
    ],
    MOBILE_BANKING: [
      {
        key: 'mobileBankingProvider',
        label: t('paymentHistory.field.mobileBankingProvider'),
        type: 'select',
        options: getMobileBankingProviders(t),
      },
      { key: 'accountMobileNumber', label: t('paymentHistory.field.accountMobileNumber') },
      { key: 'transactionRef', label: t('paymentHistory.field.transactionRef') },
      { key: 'paymentDate', label: t('paymentHistory.field.paymentDate'), type: 'date' },
    ],
    CASH: [
      { key: 'paymentDate', label: t('paymentHistory.field.paymentDate'), type: 'date' },
      { key: 'receivedBy', label: t('paymentHistory.field.receivedBy') },
      { key: 'receiptNumber', label: t('paymentHistory.field.receiptNumber') },
    ],
    CHEQUE: [
      { key: 'bankName', label: t('paymentHistory.field.bankName'), type: 'select', options: getBankNames(t) },
      { key: 'chequeNumber', label: t('paymentHistory.field.chequeNumber') },
      { key: 'accountHolderName', label: t('paymentHistory.field.accountHolderName') },
      { key: 'chequeDate', label: t('paymentHistory.field.chequeDate'), type: 'date' },
    ],
  };
}

/**
 * Flattens getTransactionPaymentFields into a single key → label lookup, for
 * rendering a saved transaction's paymentDetails in the read-only detail
 * view (where only the stored field keys are available, not which payment
 * method rendered them originally).
 */
export function getTransactionPaymentFieldLabelMap(t: T): Record<string, string> {
  const byMethod = getTransactionPaymentFields(t);
  const map: Record<string, string> = {};
  for (const fields of Object.values(byMethod)) {
    for (const field of fields) map[field.key] = field.label;
  }
  return map;
}

/** Transaction type choices for the Payment History filter panel. */
export const getTransactionTypes = (t: T): Option[] =>
  buildOptions(t, 'paymentHistory.type', ['subscription', 'payment', 'discount', 'refund', 'adjustment', 'credit']).map(
    (o) => ({ ...o, value: o.value.toUpperCase() })
  );

/** Payment status choices for the Payment History filter panel. */
export const getPaymentStatuses = (t: T): Option[] =>
  buildOptions(t, 'paymentHistory.status', ['paid', 'pending', 'failed', 'cancelled', 'refunded', 'partially_paid']).map(
    (o) => ({ ...o, value: o.value.toUpperCase() })
  );
