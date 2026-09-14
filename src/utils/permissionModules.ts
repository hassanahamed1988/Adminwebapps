import {
  Truck, FolderOpen, Contact, Search, TrendingUp, CreditCard, HeartHandshake,
  CalendarOff, PlusCircle, Settings as SettingsIcon, LifeBuoy, UserCircle2,
  MessageSquare, Palette, Fuel as FuelIcon, Landmark, Download,
  ReceiptText, Receipt, ShoppingCart, Wallet as WalletIcon, Lock, LucideIcon, Puzzle,
  Car, Wrench, PiggyBank,
} from 'lucide-react';

// Mirrors GLOBAL_DASHBOARD_MODULES / DEFAULT_OVERRIDABLE_PERMISSIONS from the
// mobile app's src/constants.tsx and the permission-resolution logic in its
// Dashboard.tsx — so a toggle made here has the exact same real effect on
// what the mobile user actually sees, not just a cosmetic flag.
//
// Re-synced against mobile app build v08: USER_FILES_LIST was removed
// (UserFilesList.tsx no longer exists in the app); VEHICLE_LIST and
// VEHICLE_SERVICES were added (new Car/Wrench menu items in Layout.tsx).
//
// NOTE ON VEHICLE_LIST / VEHICLE_SERVICES: as of v08 these two are shown to
// every non-admin user unconditionally — Layout.tsx's `vehicleItems` array
// is the only menu section that does NOT run through mobile's `filterItems`
// permission check the way every other section does. Toggling them here
// updates the stored permission correctly, but it won't yet change what a
// mobile user actually sees until the mobile app's own code adds that
// `filterItems` gate — this file can only control what's *possible* to
// enforce, not enforce it on the other codebase's behalf.
//
// The mobile app resolves access to a module in one of two ways:
//   - "Overridable" modules are ON by default; an admin can explicitly
//     DENY one, which mobile then reads from `user.deniedPermissions`.
//   - Every other user-facing module is OFF by default; an admin must
//     explicitly ALLOW one, which mobile reads from `user.permissions`.
// `type: 'admin'` modules (ADMIN, CONTROL_PANEL, account-management
// screens...) are the admin app's own navigation, not something granted to
// a mobile end-user, so they're excluded from this list entirely.

export interface AppModule {
  id: string;
  label: string;
}

export const APP_MODULES: AppModule[] = [
  { id: 'NEW_TRIP', label: 'New Trip' },
  { id: 'MONTHLY_FILES', label: 'Monthly Files' },
  { id: 'CONTACTS', label: 'Contacts' },
  { id: 'SEARCH', label: 'Search' },
  { id: 'MY_INCOME', label: 'My Income' },
  { id: 'PAYMENT', label: 'Payment' },
  { id: 'FAMILY_MAINTENANCE', label: 'Family Maintenance' },
  { id: 'LEAVE_SETTLEMENT', label: 'Leave Settlement' },
  { id: 'ADD_MONEY', label: 'Add Money' },
  { id: 'SETTINGS', label: 'Settings' },
  { id: 'SUPPORT', label: 'Support' },
  { id: 'USER_PROFILE', label: 'Profile' },
  { id: 'CHAT', label: 'Chat' },
  { id: 'THEME', label: 'Theme' },
  { id: 'FUEL', label: 'Fuel' },
  { id: 'LOAN', label: 'Loan' },
  { id: 'DOWNLOAD', label: 'Download' },
  { id: 'STATEMENT', label: 'Statement' },
  { id: 'INVOICE', label: 'Invoice' },
  { id: 'PURCHASE', label: 'Purchase' },
  { id: 'WALLET', label: 'Wallet' },
  { id: 'SECURITY', label: 'Security' },
  { id: 'VEHICLE_LIST', label: 'Vehicle List' },
  { id: 'VEHICLE_SERVICES', label: 'Vehicle Services' },
  // Off by default (not in DEFAULT_OVERRIDABLE_PERMISSIONS below) — a new,
  // financially-sensitive feature an admin must explicitly grant per user
  // rather than one that's suddenly on for everyone.
  { id: 'BANK_ACCOUNT', label: 'Bank Account' },
];

/** One icon per module, for the Access Permission icon-grid (registration
 * form) and any other UI that wants a visual per module. Any module id not
 * listed here (e.g. a brand-new one added later) falls back to `Puzzle` —
 * so a future module works immediately without this file needing an edit
 * first, per the "easy to extend" requirement. */
export const MODULE_ICONS: Record<string, LucideIcon> = {
  NEW_TRIP: Truck,
  MONTHLY_FILES: FolderOpen,
  CONTACTS: Contact,
  SEARCH: Search,
  MY_INCOME: TrendingUp,
  PAYMENT: CreditCard,
  FAMILY_MAINTENANCE: HeartHandshake,
  LEAVE_SETTLEMENT: CalendarOff,
  ADD_MONEY: PlusCircle,
  SETTINGS: SettingsIcon,
  SUPPORT: LifeBuoy,
  USER_PROFILE: UserCircle2,
  CHAT: MessageSquare,
  THEME: Palette,
  FUEL: FuelIcon,
  LOAN: Landmark,
  DOWNLOAD: Download,
  STATEMENT: ReceiptText,
  INVOICE: Receipt,
  PURCHASE: ShoppingCart,
  WALLET: WalletIcon,
  SECURITY: Lock,
  VEHICLE_LIST: Car,
  VEHICLE_SERVICES: Wrench,
  BANK_ACCOUNT: PiggyBank,
};
export const DEFAULT_MODULE_ICON: LucideIcon = Puzzle;

/** Translated module name — `module.<id>` keys live in en.ts/bn.ts so the
 * grid never mixes languages with the rest of the page. Falls back to the
 * English label above for a module added before its translation exists,
 * rather than showing a raw/missing key. */
export function moduleLabel(t: (key: string) => string, moduleId: string): string {
  const key = `module.${moduleId}`;
  const translated = t(key);
  return translated === key ? APP_MODULES.find((m) => m.id === moduleId)?.label || moduleId : translated;
}

/** ON by default — an entry in deniedPermissions turns one of these OFF. */
export const DEFAULT_OVERRIDABLE_PERMISSIONS = [
  'SECURITY', 'THEME', 'DOWNLOAD', 'SEARCH', 'USER_PROFILE', 'SUPPORT',
  'SETTINGS', 'STATEMENT', 'INVOICE', 'PAYMENT', 'LEAVE_SETTLEMENT',
  'FUEL', 'WALLET', 'CHAT', 'CONTACTS',
];

export function isModuleAllowed(
  moduleId: string,
  permissions: string[] | undefined,
  deniedPermissions: string[] | undefined
): boolean {
  if (DEFAULT_OVERRIDABLE_PERMISSIONS.includes(moduleId)) {
    return !(deniedPermissions || []).includes(moduleId);
  }
  return (permissions || []).includes(moduleId);
}

/** Returns the updated { permissions, deniedPermissions } pair after
 * flipping one module's allowed state — the caller just persists it. */
export function toggleModule(
  moduleId: string,
  nextAllowed: boolean,
  permissions: string[] | undefined,
  deniedPermissions: string[] | undefined
): { permissions: string[]; deniedPermissions: string[] } {
  const perms = new Set(permissions || []);
  const denied = new Set(deniedPermissions || []);

  if (DEFAULT_OVERRIDABLE_PERMISSIONS.includes(moduleId)) {
    if (nextAllowed) denied.delete(moduleId);
    else denied.add(moduleId);
  } else {
    if (nextAllowed) perms.add(moduleId);
    else perms.delete(moduleId);
  }

  return { permissions: Array.from(perms), deniedPermissions: Array.from(denied) };
}
