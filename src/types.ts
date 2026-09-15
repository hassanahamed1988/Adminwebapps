// Mirrors the User shape used by the FleetPro mobile app (src/types.ts)
// so records read/written here stay fully compatible.

export type UserRole = 'ADMIN' | 'USER' | 'MANAGER';
export type UserStatus = 'PENDING' | 'ENABLED' | 'DISABLED' | 'BLOCKED';

export interface User {
  id: string;
  userId?: string;
  name: string;
  email: string;
  loginEmail?: string;
  password?: string;
  is2FAEnabled?: boolean;
  role: UserRole;
  status: UserStatus;
  expiryDate?: string;
  avatar?: string;
  nationality?: string;
  dob?: string;
  religion?: string;
  gender?: string;
  profession?: string;
  // Mobile with country code
  countryCode?: string;
  mobileNumber?: string;
  mobile?: string;
  whatsapp?: string;
  // Document / ID
  idIssueCountry?: string;
  idType?: string;
  idNumber?: string;
  idExpiryDate?: string;
  // Address
  isFirstLogin?: boolean;
  passwordChangedAt?: string;
  companyName?: string;
  presentCountry?: string;
  country?: string;
  division?: string;
  district?: string;
  city?: string;
  state?: string;
  area?: string;
  buildingNumber?: string;
  zoneNumber?: string;
  streetNumber?: string;
  postalCode?: string;
  // Subscription
  duration?: string;
  price?: string;
  package?: string;
  activationDate?: string;
  packagePrice?: number;
  paidAmount?: number;
  discountAmount?: number;
  dueAmount?: number;
  permissions?: string[];
  deniedPermissions?: string[];
  statusTimestamp?: string;
  blockTimestamp?: string;
  registrationDate?: string;
  accountNumber?: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  paymentMethod?: string;
  accountHolderName?: string;
  accountOrChequeNumber?: string;
  firebaseUid?: string;
  [key: string]: any;
}

export type AccountBucket = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

// ── Payment History ──
// Lives at `${collectionFor(user)}/{user.id}/payments` — the subcollection
// name was already reserved in UsersContext.SUBCOLLECTIONS (cascade-delete
// list) but nothing wrote to it yet. This is the single source of truth for
// the Payment History tab: summary cards and the transaction table both
// derive from these records, never from ad-hoc frontend math.
export type TransactionType = 'SUBSCRIPTION' | 'PAYMENT' | 'DISCOUNT' | 'REFUND' | 'ADJUSTMENT' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_PAID';

export interface PaymentTransaction {
  id: string;
  transactionType: TransactionType;
  description?: string;
  /** Original/gross amount before discount, in the account's billing currency. */
  amount: number;
  discount?: number;
  /** Net amount actually paid for this transaction (amount - discount, or less if partial). */
  paidAmount?: number;
  paymentMethod?: string;
  /**
   * Method-specific details (bank name, transaction reference, payment date,
   * received-by, etc.) keyed by field name. Shape varies by paymentMethod —
   * kept as a generic string map (rather than named columns per method) so a
   * new payment method can be added without a type/schema change.
   */
  paymentDetails?: Record<string, string>;
  status: PaymentStatus;
  referenceId?: string;
  category?: string;
  section?: string;
  note?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  /**
   * Append-only edit history. A transaction's prior fields are never
   * overwritten silently — each edit adds one entry here instead of
   * discarding what came before.
   */
  auditLog?: PaymentAuditEntry[];
}

export interface PaymentAuditEntry {
  previousValue: Partial<PaymentTransaction>;
  newValue: Partial<PaymentTransaction>;
  updatedBy: string;
  updatedAt: string;
  reason?: string;
}

/** A single line item inside a purchase request. */
export interface PurchaseItem {
  id: string;
  name: string;
  price: string;
  quantity: string;
  unit: string;
  total: number;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/**
 * A hypermarket/grocery purchase a mobile user submitted for reimbursement.
 * Backing store: `${collectionFor(user)}/{user.id}/Purchase` — written by
 * the mobile app's Purchase.tsx, previously only approvable from within the
 * mobile app's own admin Notifications screen.
 */
export interface PurchaseRequest {
  id: string;
  hypermarketName: string;
  date: string;
  amount: number;
  items?: PurchaseItem[];
  status: ApprovalStatus;
}

/**
 * A payment a mobile user made to a partner/merchant (e.g. from their
 * wallet) that needs admin confirmation before it's treated as settled.
 * Backing store: `${collectionFor(user)}/{user.id}/messPayments` — written
 * by the mobile app's Purchase.tsx payment flow, previously only
 * approvable from within the mobile app's own admin Notifications screen.
 */
export interface MessPaymentRequest {
  id: string;
  userId?: string;
  partnerId?: string;
  amount: number;
  method: string;
  transactionId?: string;
  date: string;
  time?: string;
  remarks?: string;
  status: ApprovalStatus;
  createdAt?: number;
  bankDetails?: {
    country?: string;
    bankName?: string;
    branch?: string;
    accountTitle?: string;
    accountNumber?: string;
  };
}

// ── Purchase Manager & Partners ──
export type PartnerAccountType = 'MANAGER' | 'PARTNER';
export type PartnerStatus = 'active' | 'inactive' | 'deleted';

export interface Partner {
  id: string;
  partnerId?: string; // e.g. "MGR-1234567" for manager, "1234567" for partner
  userId: string;
  name: string;
  mobile?: string;
  dob?: string;
  nationality?: string;
  country?: string;
  stateNumber?: string;
  zoneNumber?: string;
  buildingNumber?: string;
  electricityNumber?: string;
  areaName?: string;
  monthlySalary?: string | number;
  price?: string | number;
  joiningDate?: string;
  joiningTime?: string;
  createdAt?: number;
  avatar?: string | null;
  accountType: PartnerAccountType;
  managerId?: string; // ID of the supervising manager partner (empty for managers)
  status: PartnerStatus;
  [key: string]: any;
}

export interface PurchaseDoc {
  id: string;
  userId?: string;
  hypermarketName?: string;
  date?: string;
  amount?: number | string;
  status?: string;
  items?: any[];
  [key: string]: any;
}

