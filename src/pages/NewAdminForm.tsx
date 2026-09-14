import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  UserCog,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Wand2,
  Copy,
  Check,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  Globe2,
  MapPin,
  Building2,
  Map as MapIcon,
  Briefcase,
  BookOpen,
  Users,
  Hash,
  FileText,
  CreditCard,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import EditableFloatingSelect from '../components/EditableFloatingSelect';
import PhoneCountryInput from '../components/PhoneCountryInput';
import FloatingDateInput from '../components/FloatingDateInput';
import DesktopModalCard from '../components/DesktopModalCard';
import { StepTracker, StepNavigation, StepDef } from '../components/FormStepper';
import { useUsers } from '../contexts/UsersContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { User, UserRole } from '../types';
import { generateUserId, sanitizeDocId } from '../utils/accountUtils';
import { getCountries, getNationalities } from '../utils/geoOptions';
import { getGenders, getReligions, getProfessions, getDocumentTypes, documentNumberLabel, validateMobileNumber, validateDocumentNumber } from '../utils/formOptions';

/* ─────────────────────── Dynamic column grid ───────────────────────
   Desktop (>= lg): up to 4 columns max. Tablet: 2. Mobile: 1.
   `cols` lets a step with few fields use fewer columns so it doesn't
   stretch out and look sparse. */
const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
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

/* ───────────────────────────── Roles ────────────────────────────────
   Admin-panel access is only granted to ADMIN and MANAGER roles (see
   services/auth.ts) — a plain USER can never log into this web panel,
   so that role is intentionally left out of this form's dropdown.     */
const ROLE_OPTION_KEYS = [
  { value: '', labelKey: 'newAdminForm.selectEllipsis' },
  { value: 'ADMIN', labelKey: 'newAdminForm.superAdmin' },
  { value: 'MANAGER', labelKey: 'newAdminForm.companyAdmin' },
];

/* ─────────────────────────────── Steps ──────────────────────────────
   Split by category so no single step grows too tall:
     1. Personal Information (incl. Role + Contact)
     2. Document
     3. Address
     4. Security / Password                                    */
const STEP_DEFS: { key: string; titleKey: string; icon: any }[] = [
  { key: 'personal', titleKey: 'newUserForm.step.personal', icon: UserCog },
  { key: 'document', titleKey: 'newUserForm.step.document', icon: FileText },
  { key: 'address', titleKey: 'newUserForm.step.address', icon: MapPin },
  { key: 'security', titleKey: 'newUserForm.step.security', icon: KeyRound },
];

const EMPTY_FORM = {
  fullName: '',
  role: '' as UserRole | '',
  // Personal
  nationality: '',
  dob: '',
  gender: '',
  religion: '',
  profession: '',
  // Contact
  email: '',
  countryCode: '+880',
  mobile: '',
  whatsapp: '',
  // Document
  idIssueCountry: '',
  idType: '',
  idNumber: '',
  // Address
  country: '',
  buildingNumber: '',
  zoneNumber: '',
  streetNumber: '',
  area: '',
  city: '',
  state: '',
  postalCode: '',
  // Auth
  adminId: '',
  password: '',
  confirmPassword: '',
};

const NewAdminForm: React.FC = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { users, createUser } = useUsers();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const STEPS: StepDef[] = STEP_DEFS.map((s) => ({ key: s.key, title: t(s.titleKey), icon: s.icon }));
  const ROLE_OPTIONS = ROLE_OPTION_KEYS.map((r) => ({ value: r.value, label: t(r.labelKey) }));

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; adminId: string; password: string; name: string; role: string } | null>(null);
  const [copied, setCopied] = useState<'id' | 'pw' | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleGenerateId = () => set('adminId', generateUserId(users));

  /* ─────────── Per-step validation (blocks "Next" until valid) ─────────── */
  const validateStep = (index: number): Record<string, string> => {
    const e: Record<string, string> = {};
    const key = STEPS[index].key;

    if (key === 'personal') {
      if (!form.fullName.trim()) e.fullName = t('newUserForm.err.fieldRequired');
      if (!form.role) e.role = t('newAdminForm.selectRole');
      if (!form.email.trim() || !form.email.includes('@')) e.email = t('newUserForm.err.validEmail');
      if (form.email && users.some((u) => u.email === form.email || u.loginEmail === form.email)) {
        e.email = t('newUserForm.err.emailExists');
      }
      // Mobile number is optional in this form — if provided, its format is checked
      if (form.mobile.trim()) {
        const mobileErrorKey = validateMobileNumber(form.countryCode, form.mobile);
        if (mobileErrorKey) e.mobile = t(mobileErrorKey);
      }
    }

    if (key === 'document') {
      // ID Type/Number are optional in this form — if either is provided, both are required and format-checked
      if (form.idType || form.idNumber.trim()) {
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
    }

    if (key === 'security') {
      if (!form.password || form.password.length < 4) e.password = t('newUserForm.err.passwordMinLength');
      if (form.password !== form.confirmPassword) e.confirmPassword = t('newUserForm.err.passwordMismatch');
      const aid = form.adminId.trim();
      if (aid && users.some((u) => u.userId === aid || u.id === aid)) {
        e.adminId = t('newAdminForm.idTaken');
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
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));

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
      const finalAdminId = form.adminId.trim() || generateUserId(users);
      const docId = sanitizeDocId(finalAdminId);
      const fullMobile = form.mobile.trim() ? `${form.countryCode}${form.mobile.trim()}` : '';

      const newAdmin: User = {
        id: docId,
        userId: finalAdminId,
        name: form.fullName.trim(),
        email: form.email.trim(),
        loginEmail: form.email.trim(),
        role: form.role as UserRole,
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
        country: form.country.trim(),
        presentCountry: form.country.trim(),
        buildingNumber: form.buildingNumber.trim(),
        zoneNumber: form.zoneNumber.trim(),
        streetNumber: form.streetNumber.trim(),
        area: form.area.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
      };

      await createUser(newAdmin, form.password);
      setCreated({ id: docId, adminId: finalAdminId, password: form.password, name: newAdmin.name, role: form.role });
      showToast(t('newAdminForm.accountCreated'), 'success');
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

  const roleLabel = (role: string) => ROLE_OPTIONS.find((r) => r.value === role)?.label || role;

  /* ─── Success screen ─── */
  if (created) {
    return (
      <DesktopModalCard header={<Topbar title={t('nav.newAdmin')} onMenuClick={openMobileNav} onClose={() => navigate('/')} />}>
        <div className="px-4 md:px-8 py-10 max-w-md mx-auto">
          <div className="bg-surface rounded-2xl border border-active-500/25 card-shadow p-6 text-center rise-in">
            <div className="w-14 h-14 rounded-2xl bg-active-500/10 text-active-500 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={26} />
            </div>
            <h2 className="font-display font-extrabold text-lg text-ink-900 mb-1">{t('newAdminForm.accountCreatedHeading')}</h2>
            <p className="text-sm text-ink-600 mb-6">
              {t('newAdminForm.activatedMessage', { name: created.name, role: roleLabel(created.role) })}
            </p>

            <div className="space-y-2.5 text-left mb-6">
              <div className="flex items-center justify-between bg-ink-900/[0.03] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-ink-400 mb-0.5">{t('newAdminForm.adminIdLabel')}</p>
                  <p className="font-mono text-sm font-bold text-ink-900">{created.adminId}</p>
                </div>
                <button
                  onClick={() => copy(created.adminId, 'id')}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-900/5"
                >
                  {copied === 'id' ? <Check size={15} className="text-active-500" /> : <Copy size={15} />}
                </button>
              </div>
              <div className="flex items-center justify-between bg-ink-900/[0.03] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-ink-400 mb-0.5">{t('login.password')}</p>
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
     scrolls, regardless of how many fields a step has. The whole card is
     rendered as a single <form> (as="form") so the footer's submit button
     still participates in this form's onSubmit even though it now lives
     outside the body's own markup. */
  return (
    <DesktopModalCard
      as="form"
      formProps={{ onSubmit: handleSubmit }}
      header={
        <>
          <Topbar
            title={t('newAdminForm.title')}
            subtitle={t('newAdminForm.subtitle')}
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
          {/* Personal info (incl. Identity + Contact) */}
          {activeKey === 'personal' && (
            <>
              <StepCard title={t('newAdminForm.contact')} cols={2}>
                <FloatingInput label={t('newUserForm.fullName')} icon={UserCog} required value={form.fullName} onChange={(v) => set('fullName', v)} error={errors.fullName} />
                <FloatingSelect label={t('newAdminForm.role')} icon={UserCog} required value={form.role} onChange={(v) => set('role', v)} options={ROLE_OPTIONS} error={errors.role} />
              </StepCard>

              <StepCard title={t('newUserForm.step.personal')} subtitle={t('newUserForm.basicInfo')} cols={4}>
                <EditableFloatingSelect label={t('newUserForm.nationality')} icon={Globe2} field="nationality" value={form.nationality} onChange={(v) => set('nationality', v)} options={getNationalities(t)} />
                <FloatingDateInput label={t('newUserForm.dob')} value={form.dob} onChange={(v) => set('dob', v)} />
                <EditableFloatingSelect label={t('field.gender')} icon={Users} field="gender" value={form.gender} onChange={(v) => set('gender', v)} options={getGenders(t)} />
                <EditableFloatingSelect label={t('field.religion')} icon={BookOpen} field="religion" value={form.religion} onChange={(v) => set('religion', v)} options={getReligions(t)} />
                <EditableFloatingSelect label={t('field.profession')} icon={Briefcase} field="profession" value={form.profession} onChange={(v) => set('profession', v)} options={getProfessions(t)} />
                <FloatingInput label={t('newAdminForm.emailLogin')} icon={Mail} type="email" required value={form.email} onChange={(v) => set('email', v)} error={errors.email} />
                <FloatingInput label={t('newUserForm.whatsapp')} icon={MessageCircle} value={form.whatsapp} onChange={(v) => set('whatsapp', v)} />
                {/* Full-width phone input with code selector */}
                <div className="sm:col-span-2 lg:col-span-4">
                  <PhoneCountryInput
                    label={t('newAdminForm.mobileOptional')}
                    countryCode={form.countryCode}
                    onCodeChange={(v) => set('countryCode', v)}
                    number={form.mobile}
                    onNumberChange={(v) => set('mobile', v)}
                    error={errors.mobile}
                  />
                </div>
              </StepCard>
            </>
          )}

          {/* Document / ID */}
          {activeKey === 'document' && (
            <StepCard title={t('newUserForm.document')} cols={3}>
              <EditableFloatingSelect label={t('field.idIssueCountry')} icon={Globe2} field="country" value={form.idIssueCountry} onChange={(v) => set('idIssueCountry', v)} options={getCountries(t)} />
              <EditableFloatingSelect label={t('field.documentType')} icon={FileText} field="documentType" value={form.idType} onChange={(v) => set('idType', v)} options={getDocumentTypes(t)} />
              <FloatingInput label={documentNumberLabel(t, form.idType)} icon={CreditCard} value={form.idNumber} onChange={(v) => set('idNumber', v)} mono error={errors.idNumber} />
            </StepCard>
          )}

          {/* Address */}
          {activeKey === 'address' && (
            <StepCard title={t('newUserForm.step.address')} cols={4}>
              <EditableFloatingSelect label={t('field.country')} icon={Globe2} field="country" value={form.country} onChange={(v) => set('country', v)} options={getCountries(t)} />
              <FloatingInput label={t('userDetail.buildingNumber')} icon={Building2} value={form.buildingNumber} onChange={(v) => set('buildingNumber', v)} />
              <FloatingInput label={t('userDetail.zoneNumber')} icon={MapPin} value={form.zoneNumber} onChange={(v) => set('zoneNumber', v)} />
              <FloatingInput label={t('userDetail.streetNumber')} icon={MapIcon} value={form.streetNumber} onChange={(v) => set('streetNumber', v)} />
              <FloatingInput label={t('newUserForm.addressArea')} icon={MapPin} value={form.area} onChange={(v) => set('area', v)} />
              <FloatingInput label={t('newUserForm.cityDivision')} icon={Building2} value={form.city} onChange={(v) => set('city', v)} />
              <FloatingInput label={t('newUserForm.stateDistrict')} icon={MapIcon} value={form.state} onChange={(v) => set('state', v)} />
              <FloatingInput label={t('newUserForm.postalCode')} icon={Hash} value={form.postalCode} onChange={(v) => set('postalCode', v)} />
            </StepCard>
          )}

          {/* Security / Auth */}
          {activeKey === 'security' && (
            <StepCard title={t('newUserForm.securityAndPassword')} subtitle={t('newUserForm.loginInfo')} cols={2}>
              <FloatingInput
                label={t('newAdminForm.idAutoHint')}
                icon={Fingerprint}
                value={form.adminId}
                onChange={(v) => set('adminId', v)}
                error={errors.adminId}
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
        </div>
      </div>
    </DesktopModalCard>
  );
};

export default NewAdminForm;
