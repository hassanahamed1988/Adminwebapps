import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  UserPlus,
  Wand2,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  KeyRound,
  Lock,
  Fingerprint,
  Hash,
  Mail,
  MessageCircle,
  Globe2,
  MapPin,
  Building2,
  Map as MapIcon,
  Briefcase,
  BookOpen,
  Users,
  Clock3,
  Package,
  Wallet,
  FileText,
  CreditCard,
  IdCard,
  Landmark,
  User as UserIcon,
  Hash as HashIcon,
  Banknote,
  ShieldQuestion,
  Percent,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import EditableFloatingSelect from '../components/EditableFloatingSelect';
import PhoneCountryInput from '../components/PhoneCountryInput';
import FloatingDateInput from '../components/FloatingDateInput';
import DesktopModalCard from '../components/DesktopModalCard';
import PermissionGrid from '../components/PermissionGrid';
import { StepTracker, StepNavigation, StepDef } from '../components/FormStepper';
import { useUsers } from '../contexts/UsersContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { User, UserRole } from '../types';
import { generateUserId, generateAccountNumber, sanitizeDocId, computeExpiryDate } from '../utils/accountUtils';
import { getCountries, getNationalities } from '../utils/geoOptions';
import {
  getGenders,
  getReligions,
  getProfessions,
  getDocumentTypes,
  getDurations,
  documentNumberLabel,
  getPaymentMethods,
  getPaymentFieldLabels,
  getBankNames,
  getDiscountTypes,
  computeDiscountedPrice,
  validateMobileNumber,
  validateDocumentNumber,
} from '../utils/formOptions';

/* ─────────────────────── Dynamic column grid ───────────────────────
   Desktop (>= lg): up to 4 columns per the "সর্বোচ্চ চার কলম" requirement.
   Tablet (sm-lg): 2 columns. Mobile: 1 column (unchanged from before).
   `cols` lets an individual step opt into fewer columns when it has few
   fields (e.g. Security has only 2 fields → 2 columns reads better than
   stretching to 4), keeping each step visually compact / not too tall. */
const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
};

const StepCard: React.FC<{ title: string; subtitle?: string; cols?: number; children: React.ReactNode }> = ({
  title,
  subtitle,
  cols = 4,
  children,
}) => (
  <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
    <div className="mb-4">
      <h3 className="font-display font-extrabold text-sm text-ink-900">{title}</h3>
      {subtitle && <p className="text-xs text-ink-400 font-medium mt-0.5">{subtitle}</p>}
    </div>
    <div className={`grid ${GRID_COLS[cols]} gap-x-4 gap-y-5`}>{children}</div>
  </div>
);

/* ─────────────────────────────── Steps ──────────────────────────────
   Split by category so no single step grows too tall:
     1. Personal Information
     2. Document
     3. Address
     4. Access Permission
     5. Subscription (package/duration/price)
     6. Payment Info (preview of the chosen package + payment method fields)
     7. Security / Password                                        */
const STEP_DEFS: { key: string; titleKey: string; icon: any }[] = [
  { key: 'personal', titleKey: 'newUserForm.step.personal', icon: UserPlus },
  { key: 'document', titleKey: 'newUserForm.step.document', icon: FileText },
  { key: 'address', titleKey: 'newUserForm.step.address', icon: MapPin },
  { key: 'permissions', titleKey: 'newUserForm.step.permissions', icon: ShieldQuestion },
  { key: 'subscription', titleKey: 'newUserForm.step.subscription', icon: Package },
  { key: 'paymentInfo', titleKey: 'newUserForm.step.paymentInfo', icon: CreditCard },
  { key: 'security', titleKey: 'newUserForm.step.security', icon: KeyRound },
];

/* ─────────────────────────── Form state ─────────────────────────── */
const EMPTY_FORM = {
  role: 'USER' as UserRole,
  // Personal
  fullName: '',
  nationality: '',
  dob: '',
  gender: '',
  religion: '',
  profession: '',
  countryCode: '+880',
  mobile: '',
  email: '',
  whatsapp: '',
  // Document
  idIssueCountry: '',
  idType: '',
  idNumber: '',
  idExpiryDate: '',
  // Address
  country: '',
  buildingNumber: '',
  zoneNumber: '',
  streetNumber: '',
  area: '',
  city: '',
  state: '',
  postalCode: '',
  // Access Permission — which mobile app modules this user can see.
  // Empty arrays mean "defaults": overridable modules ON, opt-in modules
  // OFF, resolved the same way isModuleAllowed() resolves an existing
  // user's permissions.
  permissions: [] as string[],
  deniedPermissions: [] as string[],
  // Auth
  userId: '',
  password: '',
  confirmPassword: '',
  // Subscription
  duration: '1 MONTH',
  package: '',
  price: '',
  discountType: '',
  discountValue: '',
  // Payment (subscription step)
  paymentMethod: '',
  paymentBankName: '',
  paymentHolderName: '',
  paymentAccountOrCheque: '',
  paymentAmount: '',
};

/* ═══════════════════════ Main Component ════════════════════════════ */
const MobileAppNewUserForm: React.FC = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { users, createUser } = useUsers();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const STEPS: StepDef[] = STEP_DEFS.map((s) => ({ key: s.key, title: t(s.titleKey), icon: s.icon }));

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; userId: string; password: string; name: string } | null>(null);
  const [copied, setCopied] = useState<'id' | 'pw' | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleGenerateId = () => set('userId', generateUserId(users));

  const paymentLabels = getPaymentFieldLabels(t)[form.paymentMethod];
  const finalPayable = computeDiscountedPrice(form.price, form.discountType, form.discountValue);
  const hasDiscount = !!form.discountType && Number(form.discountValue) > 0 && form.price.trim() !== '';
  const formatAmount = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

  /* ─────────── Per-step validation (blocks "পরবর্তী" until valid) ─────────── */
  const validateStep = (index: number): Record<string, string> => {
    const e: Record<string, string> = {};
    const key = STEPS[index].key;

    if (key === 'personal') {
      if (!form.fullName.trim()) e.fullName = t('newUserForm.err.fieldRequired');
      const mobileErrorKey = validateMobileNumber(form.countryCode, form.mobile);
      const mobileError = mobileErrorKey ? t(mobileErrorKey) : '';
      if (mobileError) e.mobile = mobileError;
      if (!form.email.trim() || !form.email.includes('@')) e.email = t('newUserForm.err.validEmail');

      const fullMobile = `${form.countryCode}${form.mobile.trim()}`;
      if (!mobileError && users.some((u) => u.mobileNumber === fullMobile || u.mobile === form.mobile.trim())) {
        e.mobile = t('newUserForm.err.mobileExists');
      }
      if (form.email && users.some((u) => u.email === form.email || u.loginEmail === form.email)) {
        e.email = t('newUserForm.err.emailExists');
      }
    }

    if (key === 'document') {
      const idErrorKey = validateDocumentNumber(form.idType, form.idNumber);
      if (idErrorKey) {
        e.idNumber = t(idErrorKey);
      } else if (
        form.idNumber.trim() &&
        users.some((u) => u.idType === form.idType && u.idNumber === form.idNumber.trim())
      ) {
        e.idNumber = t('newUserForm.err.documentExists');
      }
    }

    if (key === 'address') {
      if (!form.country.trim()) e.country = t('newUserForm.err.countryRequired');
      if (!form.area.trim()) e.area = t('newUserForm.err.addressRequired');
      if (!form.city.trim()) e.city = t('newUserForm.err.cityRequired');
      if (!form.state.trim()) e.state = t('newUserForm.err.stateRequired');
      if (!form.postalCode.trim()) e.postalCode = t('newUserForm.err.postalRequired');
    }

    if (key === 'security') {
      if (!form.password || form.password.length < 4) e.password = t('newUserForm.err.passwordMinLength');
      if (form.password !== form.confirmPassword) e.confirmPassword = t('newUserForm.err.passwordMismatch');
      const uid = form.userId.trim();
      if (uid && users.some((u) => u.userId === uid || u.id === uid)) {
        e.userId = t('newUserForm.err.userIdTaken');
      }
    }

    if (key === 'subscription') {
      if (!form.package.trim()) e.package = t('newUserForm.err.packageNameRequired');
      if (form.discountType) {
        const val = Number(form.discountValue);
        if (!form.discountValue.trim() || !(val > 0)) {
          e.discountValue = t('newUserForm.err.invalidDiscount');
        } else if (form.discountType === 'PERCENTAGE' && val > 100) {
          e.discountValue = t('newUserForm.err.invalidDiscount');
        } else if (form.discountType === 'FLAT' && form.price.trim() && val > Number(form.price)) {
          e.discountValue = t('newUserForm.err.discountExceedsPrice');
        }
      }
    }

    if (key === 'paymentInfo') {
      if (!form.paymentMethod) e.paymentMethod = t('newUserForm.err.selectPaymentMethod');

      if (form.paymentMethod === 'BANK_TRANSFER' || form.paymentMethod === 'CHEQUE') {
        if (!form.paymentBankName.trim()) e.paymentBankName = t('newUserForm.err.bankNameRequired');
        if (!form.paymentAccountOrCheque.trim()) e.paymentAccountOrCheque = t('newUserForm.err.fieldRequired');
      }
      if (form.paymentMethod === 'BANK_TRANSFER' && !form.paymentHolderName.trim()) {
        e.paymentHolderName = t('newUserForm.err.accountHolderRequired');
      }
      if (form.paymentMethod && (!form.paymentAmount.trim() || Number(form.paymentAmount) <= 0)) {
        e.paymentAmount = t('newUserForm.err.validAmount');
      }
    }

    return e;
  };

  const goNext = () => {
    const e = validateStep(stepIndex);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      showToast(t('newUserForm.err.fixFormErrors'), 'error');
      return;
    }
    // Leaving Subscription for Payment Info — carry the final (discounted)
    // amount over as the default payment amount (still editable) so the
    // preview and the amount field start out consistent.
    if (STEPS[stepIndex].key === 'subscription' && !form.paymentAmount.trim() && form.price.trim()) {
      set('paymentAmount', formatAmount(finalPayable));
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));

  /* Mobile keyboards fire "Enter"/"Done" while typing in any field. Since the
     whole multi-step form lives inside one <form>, that Enter key triggers an
     *implicit* submit the moment the Subscription step's submit button exists
     in the DOM — even if the admin hasn't finished typing package/payment
     details yet. Block that here; only an explicit click on "পরবর্তী" /
     "সাবমিট করুন" should ever advance or submit the form. */
  const blockImplicitSubmit = (ev: React.KeyboardEvent<HTMLFormElement>) => {
    if (ev.key === 'Enter' && (ev.target as HTMLElement).tagName !== 'TEXTAREA') {
      ev.preventDefault();
    }
  };

  const validateAll = (): boolean => {
    let all: Record<string, string> = {};
    for (let i = 0; i < STEPS.length; i++) all = { ...all, ...validateStep(i) };
    setErrors(all);
    return Object.keys(all).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateAll()) {
      showToast(t('newUserForm.err.fixFormErrors'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const finalUserId = form.userId.trim() || generateUserId(users);
      const docId = sanitizeDocId(finalUserId);
      const today = new Date();
      const activationDate = today.toISOString().split('T')[0];
      const fullMobile = `${form.countryCode}${form.mobile.trim()}`;

      const newUser: User = {
        id: docId,
        userId: finalUserId,
        accountNumber: generateAccountNumber(),
        name: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role,
        status: 'ENABLED',
        avatar: '',
        nationality: form.nationality.trim(),
        dob: form.dob,
        gender: form.gender,
        religion: form.religion,
        profession: form.profession,
        countryCode: form.countryCode,
        mobile: form.mobile.trim(),
        mobileNumber: fullMobile,
        whatsapp: form.whatsapp.trim(),
        idIssueCountry: form.idIssueCountry.trim(),
        idType: form.idType,
        idNumber: form.idNumber.trim(),
        idExpiryDate: form.idExpiryDate,
        country: form.country.trim(),
        presentCountry: form.country.trim(),
        buildingNumber: form.buildingNumber.trim(),
        zoneNumber: form.zoneNumber.trim(),
        streetNumber: form.streetNumber.trim(),
        area: form.area.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        permissions: form.permissions,
        deniedPermissions: form.deniedPermissions,
        duration: form.duration,
        package: form.package.trim(),
        price: form.price.trim(),
        packagePrice: form.price.trim() ? Number(form.price.trim()) : undefined,
        discountAmount: hasDiscount ? Number((Number(form.price.trim()) - finalPayable).toFixed(2)) : undefined,
        paymentMethod: form.paymentMethod,
        bankName: form.paymentBankName.trim(),
        accountHolderName: form.paymentHolderName.trim(),
        accountOrChequeNumber: form.paymentAccountOrCheque.trim(),
        paidAmount: form.paymentAmount.trim() ? Number(form.paymentAmount.trim()) : undefined,
        activationDate,
        expiryDate: computeExpiryDate(form.duration),
      };

      await createUser(newUser, form.password);
      setCreated({ id: docId, userId: finalUserId, password: form.password, name: newUser.name });
      showToast(t('newUserForm.accountCreated'), 'success');
    } catch (e: any) {
      showToast(e?.message || t('newUserForm.accountCreateFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (text: string, which: 'id' | 'pw') => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const resetForNext = () => {
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setCreated(null);
    setStepIndex(0);
  };

  /* ─── Success screen ─── */
  if (created) {
    return (
      <DesktopModalCard header={<Topbar title={t('nav.newAccount')} onMenuClick={openMobileNav} onClose={() => navigate('/')} />}>
        <div className="px-4 md:px-8 py-10 max-w-md mx-auto">
          <div className="bg-surface rounded-2xl border border-active-500/25 card-shadow p-6 text-center rise-in">
            <div className="w-14 h-14 rounded-2xl bg-active-500/10 text-active-500 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={26} />
            </div>
            <h2 className="font-display font-extrabold text-lg text-ink-900 mb-1">{t('newUserForm.accountCreatedHeading')}</h2>
            <p className="text-sm text-ink-600 mb-6">
              {t('newUserForm.activatedMessage', { name: created.name })}
            </p>

            <div className="space-y-2.5 text-left mb-6">
              <div className="flex items-center justify-between bg-ink-900/[0.03] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-ink-400 mb-0.5">{t('newUserForm.userIdLabel')}</p>
                  <p className="font-mono text-sm font-bold text-ink-900">{created.userId}</p>
                </div>
                <button
                  onClick={() => copy(created.userId, 'id')}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-900/5"
                >
                  {copied === 'id' ? <Check size={15} className="text-active-500" /> : <Copy size={15} />}
                </button>
              </div>
              <div className="flex items-center justify-between bg-ink-900/[0.03] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-ink-400 mb-0.5">{t('newUserForm.passwordLabel')}</p>
                  <p className="font-mono text-sm font-bold text-ink-900">{created.password}</p>
                </div>
                <button
                  onClick={() => copy(created.password, 'pw')}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-900/5"
                >
                  {copied === 'pw' ? <Check size={15} className="text-active-500" /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={resetForNext}
                className="flex-1 h-11 rounded-xl border border-ink-900/12 text-ink-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-ink-900/5"
              >
                <RotateCcw size={15} /> {t('newUserForm.createAnother')}
              </button>
              <button
                onClick={() => navigate(`/user/${encodeURIComponent(created.id)}`)}
                className="flex-1 h-11 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                {t('newUserForm.viewProfile')} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </DesktopModalCard>
    );
  }

  const activeKey = STEPS[stepIndex].key;

  /* ─── Main form ───
     Header (Topbar + step tracker) and footer (Prev/Next/Submit) are
     pinned by DesktopModalCard; only the field content in between ever
     scrolls, regardless of how many fields a step has — this form has the
     most steps of the three modules, so it benefits the most. Rendered as
     a single <form> (as="form") so the footer's submit button still
     participates in this form's onSubmit/onKeyDown even though it now
     lives outside the body's own markup. */
  return (
    <DesktopModalCard
      as="form"
      formProps={{ onSubmit: handleSubmit, onKeyDown: blockImplicitSubmit }}
      header={
        <>
          <Topbar
            title={t('newUserForm.title')}
            subtitle={t('newUserForm.subtitle')}
            onMenuClick={openMobileNav}
            onClose={() => navigate('/')}
          />
          <StepTracker steps={STEPS} activeIndex={stepIndex} />
        </>
      }
      footer={
        <StepNavigation
          activeIndex={stepIndex}
          totalSteps={STEPS.length}
          onPrev={goPrev}
          onNext={goNext}
          isLastStep={stepIndex === STEPS.length - 1}
          submitting={submitting}
        />
      }
    >
      <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
        <div className="space-y-5">
          {/* Role selector removed — every account created from this form is
              always a mobile-app USER account (role is fixed in EMPTY_FORM). */}
          {activeKey === 'personal' && (
            <>
              <StepCard title={t('newUserForm.step.personal')} subtitle={t('newUserForm.basicInfo')} cols={4}>
                <FloatingInput label={t('newUserForm.fullName')} icon={UserPlus} required value={form.fullName} onChange={(v) => set('fullName', v)} error={errors.fullName} />
                <EditableFloatingSelect label={t('newUserForm.nationality')} icon={Globe2} field="nationality" value={form.nationality} onChange={(v) => set('nationality', v)} options={getNationalities(t)} />
                <FloatingDateInput label={t('newUserForm.dob')} value={form.dob} onChange={(v) => set('dob', v)} />
                <EditableFloatingSelect label={t('field.gender')} icon={Users} field="gender" value={form.gender} onChange={(v) => set('gender', v)} options={getGenders(t)} />
                <EditableFloatingSelect label={t('field.religion')} icon={BookOpen} field="religion" value={form.religion} onChange={(v) => set('religion', v)} options={getReligions(t)} />
                <EditableFloatingSelect label={t('field.profession')} icon={Briefcase} field="profession" value={form.profession} onChange={(v) => set('profession', v)} options={getProfessions(t)} />
                <FloatingInput label={t('newUserForm.email')} icon={Mail} type="email" required value={form.email} onChange={(v) => set('email', v)} error={errors.email} />
                <FloatingInput label={t('newUserForm.whatsapp')} icon={MessageCircle} value={form.whatsapp} onChange={(v) => set('whatsapp', v)} />
                {/* Full-width phone input with code selector */}
                <div className="sm:col-span-2 md:col-span-3">
                  <PhoneCountryInput
                    countryCode={form.countryCode}
                    onCodeChange={(v) => set('countryCode', v)}
                    number={form.mobile}
                    onNumberChange={(v) => set('mobile', v)}
                    required
                    error={errors.mobile}
                  />
                </div>
              </StepCard>
            </>
          )}

          {/* Document */}
          {activeKey === 'document' && (
            <StepCard title={t('newUserForm.document')} cols={4}>
              <EditableFloatingSelect label={t('userDetail.idIssueCountry')} icon={Globe2} field="country" value={form.idIssueCountry} onChange={(v) => set('idIssueCountry', v)} options={getCountries(t)} />
              <EditableFloatingSelect label={t('field.documentType')} icon={FileText} field="documentType" value={form.idType} onChange={(v) => set('idType', v)} options={getDocumentTypes(t)} />
              <FloatingInput label={documentNumberLabel(t, form.idType)} icon={CreditCard} value={form.idNumber} onChange={(v) => set('idNumber', v)} mono error={errors.idNumber} />
              <FloatingDateInput label={t('userDetail.expiryDate')} value={form.idExpiryDate} onChange={(v) => set('idExpiryDate', v)} />
            </StepCard>
          )}

          {/* Address */}
          {activeKey === 'address' && (
            <StepCard title={t('newUserForm.step.address')} cols={4}>
              <EditableFloatingSelect label={t('field.country')} icon={Globe2} field="country" required value={form.country} onChange={(v) => set('country', v)} options={getCountries(t)} error={errors.country} />
              <FloatingInput label={t('userDetail.buildingNumber')} icon={Building2} value={form.buildingNumber} onChange={(v) => set('buildingNumber', v)} />
              <FloatingInput label={t('userDetail.zoneNumber')} icon={MapPin} value={form.zoneNumber} onChange={(v) => set('zoneNumber', v)} />
              <FloatingInput label={t('userDetail.streetNumber')} icon={MapIcon} value={form.streetNumber} onChange={(v) => set('streetNumber', v)} />
              <FloatingInput label={t('newUserForm.addressArea')} icon={MapPin} required value={form.area} onChange={(v) => set('area', v)} error={errors.area} />
              <FloatingInput label={t('newUserForm.cityDivision')} icon={Building2} required value={form.city} onChange={(v) => set('city', v)} error={errors.city} />
              <FloatingInput label={t('newUserForm.stateDistrict')} icon={MapIcon} required value={form.state} onChange={(v) => set('state', v)} error={errors.state} />
              <FloatingInput label={t('newUserForm.postalCode')} icon={Hash} required value={form.postalCode} onChange={(v) => set('postalCode', v)} error={errors.postalCode} />
            </StepCard>
          )}

          {/* Access Permission */}
          {activeKey === 'permissions' && (
            <StepCard title={t('newUserForm.step.permissions')} cols={4}>
              <div className="col-span-full">
                <PermissionGrid
                  permissions={form.permissions}
                  deniedPermissions={form.deniedPermissions}
                  onChange={(next) => setForm((f) => ({ ...f, ...next }))}
                />
              </div>
            </StepCard>
          )}

          {/* Security / Auth */}
          {activeKey === 'security' && (
            <StepCard title={t('newUserForm.securityAndPassword')} subtitle={t('newUserForm.loginInfo')} cols={2}>
              <FloatingInput
                label={t('newUserForm.userIdAutoHint')}
                icon={Fingerprint}
                value={form.userId}
                onChange={(v) => set('userId', v)}
                error={errors.userId}
                mono
                rightElement={
                  <button
                    type="button"
                    onClick={handleGenerateId}
                    title={t('newUserForm.autoGenerate')}
                    className="w-7 h-7 rounded-lg text-signal-600 hover:bg-signal-500/10 flex items-center justify-center"
                  >
                    <Wand2 size={15} />
                  </button>
                }
              />
              <div />
              <FloatingInput label={t('login.password')} icon={KeyRound} required mono value={form.password} onChange={(v) => set('password', v)} error={errors.password} />
              <FloatingInput
                label={t('newUserForm.confirmPassword')}
                icon={Lock}
                required
                mono
                value={form.confirmPassword}
                onChange={(v) => set('confirmPassword', v)}
                error={errors.confirmPassword}
              />
            </StepCard>
          )}

          {/* Subscription — package selection only; payment fields moved to
              the dedicated Payment Info step that follows. */}
          {activeKey === 'subscription' && (
            <StepCard title={t('newUserForm.step.subscription')} cols={3}>
              <EditableFloatingSelect label={t('newUserForm.duration')} icon={Clock3} field="duration" value={form.duration} onChange={(v) => set('duration', v)} options={getDurations(t)} />
              <FloatingInput label={t('newUserForm.packageName')} icon={Package} required value={form.package} onChange={(v) => set('package', v)} error={errors.package} />
              <FloatingInput label={t('newUserForm.priceOptional')} icon={Wallet} value={form.price} onChange={(v) => set('price', v)} />

              <FloatingSelect
                label={t('newUserForm.discountType')}
                icon={Percent}
                value={form.discountType}
                onChange={(v) => {
                  set('discountType', v);
                  set('discountValue', '');
                }}
                options={getDiscountTypes(t)}
              />
              {form.discountType && (
                <FloatingInput
                  label={
                    form.discountType === 'PERCENTAGE'
                      ? `${t('newUserForm.discountValue')} (%)`
                      : t('newUserForm.discountValue')
                  }
                  icon={Percent}
                  type="number"
                  value={form.discountValue}
                  onChange={(v) => set('discountValue', v)}
                  error={errors.discountValue}
                />
              )}

              {/* Live summary — only shown once there's an actual discount to reflect. */}
              {hasDiscount && (
                <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between rounded-xl bg-active-500/5 border border-active-500/20 px-4 py-3">
                  <span className="text-xs font-bold text-ink-500">{t('newUserForm.discountedPrice')}</span>
                  <span className="font-display font-extrabold text-sm text-active-600">{formatAmount(finalPayable)}</span>
                </div>
              )}
            </StepCard>
          )}

          {/* Payment Info — opens with a read-only preview of the package
              picked on the Subscription step, then the actual payment
              method fields. */}
          {activeKey === 'paymentInfo' && (
            <>
              <div className="bg-signal-500/5 border border-signal-500/20 rounded-2xl p-5 flex items-center gap-4 flex-wrap">
                <div className="w-11 h-11 rounded-xl bg-signal-500/10 text-signal-600 flex items-center justify-center shrink-0">
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <p className="text-[11px] font-bold text-ink-400">{t('newUserForm.step.subscription')}</p>
                  <p className="font-display font-extrabold text-sm text-ink-900">
                    {form.package.trim() || t('newUserForm.priceOptional')}
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">{form.duration}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-ink-400">
                    {hasDiscount ? t('newUserForm.finalPayable') : t('newUserForm.priceOptional')}
                  </p>
                  {hasDiscount && (
                    <p className="text-xs text-ink-400 line-through">{form.price.trim()}</p>
                  )}
                  <p className="font-display font-extrabold text-sm text-signal-600">
                    {hasDiscount ? formatAmount(finalPayable) : form.price.trim() || '—'}
                  </p>
                </div>
              </div>

              <StepCard title={t('newUserForm.paymentMethod')} subtitle={t('newUserForm.paymentFieldsHint')} cols={3}>
                <div className="sm:col-span-2 lg:col-span-3">
                  <FloatingSelect
                    label={t('newUserForm.paymentMethod')}
                    icon={Wallet}
                    value={form.paymentMethod}
                    onChange={(v) => {
                      set('paymentMethod', v);
                      // Reset fields that don't apply to the newly chosen method.
                      set('paymentBankName', '');
                      set('paymentHolderName', '');
                      set('paymentAccountOrCheque', '');
                      set('paymentAmount', '');
                    }}
                    options={getPaymentMethods(t)}
                    required
                    error={errors.paymentMethod}
                  />
                </div>

                {/* Bank Transfer: Bank Name, Account Holder Name, Account Number, Amount */}
                {form.paymentMethod === 'BANK_TRANSFER' && (
                  <>
                    <EditableFloatingSelect
                      label={paymentLabels?.bankName || t('newUserForm.bankName')}
                      icon={Landmark}
                      field="bankName"
                      required
                      value={form.paymentBankName}
                      onChange={(v) => set('paymentBankName', v)}
                      options={getBankNames(t)}
                      error={errors.paymentBankName}
                    />
                    <FloatingInput
                      label={paymentLabels?.holderName || t('newUserForm.accountHolderName')}
                      icon={UserIcon}
                      required
                      value={form.paymentHolderName}
                      onChange={(v) => set('paymentHolderName', v)}
                      error={errors.paymentHolderName}
                    />
                    <FloatingInput
                      label={paymentLabels?.accountOrCheque || t('newUserForm.accountNumber')}
                      icon={HashIcon}
                      mono
                      required
                      value={form.paymentAccountOrCheque}
                      onChange={(v) => set('paymentAccountOrCheque', v)}
                      error={errors.paymentAccountOrCheque}
                    />
                    <FloatingInput
                      label={t('newUserForm.paidAmount')}
                      icon={Wallet}
                      type="number"
                      mono
                      required
                      value={form.paymentAmount}
                      onChange={(v) => set('paymentAmount', v)}
                      error={errors.paymentAmount}
                    />
                  </>
                )}

                {/* Cheque: Bank Name, Cheque Number, Amount */}
                {form.paymentMethod === 'CHEQUE' && (
                  <>
                    <EditableFloatingSelect
                      label={paymentLabels?.bankName || t('newUserForm.bankName')}
                      icon={Landmark}
                      field="bankName"
                      required
                      value={form.paymentBankName}
                      onChange={(v) => set('paymentBankName', v)}
                      options={getBankNames(t)}
                      error={errors.paymentBankName}
                    />
                    <FloatingInput
                      label={paymentLabels?.accountOrCheque || t('newUserForm.chequeNumber')}
                      icon={IdCard}
                      mono
                      required
                      value={form.paymentAccountOrCheque}
                      onChange={(v) => set('paymentAccountOrCheque', v)}
                      error={errors.paymentAccountOrCheque}
                    />
                    <FloatingInput
                      label={t('newUserForm.paidAmount')}
                      icon={Wallet}
                      type="number"
                      mono
                      required
                      value={form.paymentAmount}
                      onChange={(v) => set('paymentAmount', v)}
                      error={errors.paymentAmount}
                    />
                  </>
                )}

                {/* Cash: just the amount received */}
                {form.paymentMethod === 'CASH' && (
                  <FloatingInput
                    label={t('newUserForm.paidAmount')}
                    icon={Banknote}
                    type="number"
                    mono
                    required
                    value={form.paymentAmount}
                    onChange={(v) => set('paymentAmount', v)}
                    error={errors.paymentAmount}
                  />
                )}
              </StepCard>
            </>
          )}
        </div>
      </div>
    </DesktopModalCard>
  );
};

export default MobileAppNewUserForm;
