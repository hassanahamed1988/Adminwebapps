import CryptoJS from 'crypto-js';

// IMPORTANT: this must match the SECRET_KEY used in the FleetPro mobile app
// (src/utils/security.ts) or records encrypted by one app cannot be
// decrypted by the other.
const SECRET_KEY = 'fleetpro_secure_key_2026';

export const encryptData = (data: string | undefined | null): string => {
  if (!data) return '';
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (encryptedData: string | undefined | null): string => {
  if (!encryptedData) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedData;
  } catch {
    return encryptedData;
  }
};

const maskValue = (value: string | undefined | null): string => {
  if (!value) return '';
  return value.toString().trim();
};

const SENSITIVE_FIELD_MAPPING: Record<string, boolean> = {
  userId: true,
  email: true,
  loginEmail: true,
  emailAddress: true,
  userEmail: true,
  dob: true,
  birthDate: true,
  dateOfBirth: true,
  mobileNumber: true,
  mobile: true,
  phoneNumber: true,
  phone: true,
  idNumber: true,
  idNo: true,
  nationalId: true,
  nid: true,
  nidNumber: true,
  passportNumber: true,
  passport: true,
  bankAccountNumber: true,
  accountNumber: true,
  cardNumber: true,
  cardNo: true,
};

export const applyMaskingBeforeSave = (data: any): any => {
  if (!data) return data;
  if (data instanceof Date) return data;
  const processed = Array.isArray(data) ? [...data] : { ...data };

  for (const field of Object.keys(SENSITIVE_FIELD_MAPPING)) {
    if (processed[field] !== undefined && processed[field] !== null) {
      const value = processed[field].toString().trim();
      if (value && !value.includes('***') && value !== '**********') {
        processed[`_secure_${field}`] = encryptData(value);
        if (!['accountNumber', 'bankAccountNumber'].includes(field)) {
          processed[field] = maskValue(value);
        }
      }
    }
  }

  for (const key of Object.keys(processed)) {
    if (processed[key] !== null && typeof processed[key] === 'object' && !(processed[key] instanceof Date)) {
      processed[key] = applyMaskingBeforeSave(processed[key]);
    }
  }

  return processed;
};

export const decryptSensitiveFields = (obj: any): any => {
  if (!obj) return obj;
  const processed = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const field of Object.keys(SENSITIVE_FIELD_MAPPING)) {
    const secureField = `_secure_${field}`;
    if (processed[secureField]) {
      const decrypted = decryptData(processed[secureField]);
      if (decrypted) {
        processed[field] = decrypted;
      }
    }
  }

  for (const key of Object.keys(processed)) {
    if (processed[key] !== null && typeof processed[key] === 'object' && !(processed[key] instanceof Date)) {
      processed[key] = decryptSensitiveFields(processed[key]);
    }
  }

  return processed;
};
