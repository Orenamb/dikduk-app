export type LicenseStatus = 'active' | 'revoked';

export interface LicensePayload {
  product: string;
  companyId: string;
  username: string;
  displayName: string;
  issued: string;
  expires: string;
}

export interface LicenseRecord {
  id: string;
  username: string;
  displayName: string;
  companyId: string;
  product: string;
  issued: string;
  expires: string;
  status: LicenseStatus;
  key: string;
  notes?: string;
  lastUsedAt?: string;
}

export interface LicenseSession {
  role: 'user' | 'admin';
  username: string;
  displayName: string;
  key: string;
  activatedAt: string;
}

export interface AccessValidationResult {
  ok: boolean;
  reason:
    | 'ok'
    | 'invalid-format'
    | 'invalid-signature'
    | 'wrong-product'
    | 'username-mismatch'
    | 'key-not-found'
    | 'revoked'
    | 'expired';
  record?: LicenseRecord;
  payload?: LicensePayload;
}

export interface LicenseTestStep {
  name: string;
  passed: boolean;
  details: string;
}

export interface LicenseSelfTestReport {
  passed: boolean;
  runAt: string;
  steps: LicenseTestStep[];
}

export const PRODUCT_CODE = 'DIKDUK-HEBREW-JOURNEY';
export const ADMIN_ACCESS_CODE = 'ADMIN-DIKDUK-LOCAL-2026';
export const LICENSE_STORAGE_KEY = 'dikduk-license-records';
export const SESSION_STORAGE_KEY = 'dikduk-license-session';

const SIGNING_SALT = 'dikduk-local-license-whitelist-2026';

function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(text: string): string {
  const normalized = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function hashChunk(input: string, seed: number): string {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
    hash = (hash + 2246822519) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function createSignature(payloadPart: string): string {
  const source = `${payloadPart}::${SIGNING_SALT}`;
  return [
    2166136261,
    1315423911,
    2654435761,
    2246822519,
    3266489917,
    668265263,
    374761393,
    1103515245,
  ].map((seed, index) => hashChunk(source, seed ^ (index * 1597334677))).join('');
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '.');
}

export function addDays(isoDate: string, days: number): string {
  const next = new Date(isoDate);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export function computeRecordState(record: LicenseRecord, nowIso = new Date().toISOString()): 'active' | 'expired' | 'revoked' {
  if (record.status === 'revoked') return 'revoked';
  if (new Date(record.expires).getTime() < new Date(nowIso).getTime()) return 'expired';
  return 'active';
}

export function createLicenseKey(payload: LicensePayload): string {
  const payloadPart = encodeBase64Url(JSON.stringify(payload));
  return `${payloadPart}.${createSignature(payloadPart)}`;
}

export function parseLicenseKey(key: string): { payloadPart: string; payload: LicensePayload } | null {
  const [payloadPart, signature] = key.split('.');
  if (!payloadPart || !signature) return null;
  if (createSignature(payloadPart) !== signature) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as Partial<LicensePayload>;
    if (
      typeof payload.product !== 'string' ||
      typeof payload.companyId !== 'string' ||
      typeof payload.username !== 'string' ||
      typeof payload.displayName !== 'string' ||
      typeof payload.issued !== 'string' ||
      typeof payload.expires !== 'string'
    ) {
      return null;
    }
    return { payloadPart, payload: payload as LicensePayload };
  } catch {
    return null;
  }
}

export function createLicenseRecord(input: {
  username: string;
  displayName: string;
  companyId: string;
  daysValid: number;
  issuedAt?: string;
  status?: LicenseStatus;
  notes?: string;
  product?: string;
}): LicenseRecord {
  const issued = input.issuedAt ?? new Date().toISOString();
  const username = normalizeUsername(input.username);
  const product = input.product ?? PRODUCT_CODE;
  const payload: LicensePayload = {
    product,
    companyId: input.companyId,
    username,
    displayName: input.displayName.trim(),
    issued,
    expires: addDays(issued, input.daysValid),
  };

  return {
    id: `${username}-${payload.companyId}`,
    username,
    displayName: payload.displayName,
    companyId: payload.companyId,
    product: payload.product,
    issued: payload.issued,
    expires: payload.expires,
    status: input.status ?? 'active',
    key: createLicenseKey(payload),
    notes: input.notes?.trim() || '',
  };
}

export function extendLicenseRecord(record: LicenseRecord, extraDays: number, nowIso = new Date().toISOString()): LicenseRecord {
  const baseIso = new Date(record.expires).getTime() > new Date(nowIso).getTime() ? record.expires : nowIso;
  const payload: LicensePayload = {
    product: record.product,
    companyId: record.companyId,
    username: record.username,
    displayName: record.displayName,
    issued: record.issued,
    expires: addDays(baseIso, extraDays),
  };

  return {
    ...record,
    expires: payload.expires,
    key: createLicenseKey(payload),
    status: 'active',
  };
}

export function changeLicenseStatus(record: LicenseRecord, status: LicenseStatus): LicenseRecord {
  return { ...record, status };
}

export function touchLicense(record: LicenseRecord, usedAt = new Date().toISOString()): LicenseRecord {
  return { ...record, lastUsedAt: usedAt };
}

export function validateLicenseAccess(input: {
  username: string;
  key: string;
  licenses: LicenseRecord[];
  nowIso?: string;
}): AccessValidationResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const parsed = parseLicenseKey(input.key.trim());
  if (!parsed) {
    const [payloadPart, signature] = input.key.trim().split('.');
    if (payloadPart && signature) return { ok: false, reason: 'invalid-signature' };
    return { ok: false, reason: 'invalid-format' };
  }

  if (parsed.payload.product !== PRODUCT_CODE) {
    return { ok: false, reason: 'wrong-product', payload: parsed.payload };
  }

  const username = normalizeUsername(input.username);
  if (parsed.payload.username !== username) {
    return { ok: false, reason: 'username-mismatch', payload: parsed.payload };
  }

  const record = input.licenses.find(item => item.key === input.key.trim());
  if (!record || record.username !== username) {
    return { ok: false, reason: 'key-not-found', payload: parsed.payload };
  }

  const state = computeRecordState(record, nowIso);
  if (state === 'revoked') return { ok: false, reason: 'revoked', payload: parsed.payload, record };
  if (state === 'expired') return { ok: false, reason: 'expired', payload: parsed.payload, record };
  return { ok: true, reason: 'ok', payload: parsed.payload, record };
}

export function createSeedLicenses(nowIso = new Date().toISOString()): LicenseRecord[] {
  return [
    createLicenseRecord({
      username: 'yael.cohen',
      displayName: 'יעל כהן',
      companyId: 'SCH-1001',
      daysValid: 30,
      issuedAt: addDays(nowIso, -2),
      notes: 'משתמשת פעילה לדוגמה',
    }),
    createLicenseRecord({
      username: 'daniel.levi',
      displayName: 'דניאל לוי',
      companyId: 'SCH-1002',
      daysValid: 14,
      issuedAt: addDays(nowIso, -1),
      notes: 'תוקף קצר לבדיקות חידוש',
    }),
    createLicenseRecord({
      username: 'michal.benami',
      displayName: 'מיכל בן עמי',
      companyId: 'SCH-1003',
      daysValid: -1,
      issuedAt: addDays(nowIso, -8),
      notes: 'רישיון שפג תוקפו לצורכי בדיקה',
    }),
    createLicenseRecord({
      username: 'itamar.haddad',
      displayName: 'איתמר חדד',
      companyId: 'SCH-1004',
      daysValid: 21,
      issuedAt: addDays(nowIso, -4),
      status: 'revoked',
      notes: 'רישיון מבוטל לצורכי בדיקה',
    }),
  ];
}

export function createSessionFromRecord(record: LicenseRecord, activatedAt = new Date().toISOString()): LicenseSession {
  return {
    role: 'user',
    username: record.username,
    displayName: record.displayName,
    key: record.key,
    activatedAt,
  };
}

export function createAdminSession(activatedAt = new Date().toISOString()): LicenseSession {
  return {
    role: 'admin',
    username: 'admin',
    displayName: 'מנהל מערכת',
    key: ADMIN_ACCESS_CODE,
    activatedAt,
  };
}

export function runLicenseSelfTest(nowIso = new Date().toISOString()): LicenseSelfTestReport {
  const baseLicenses = createSeedLicenses(nowIso);
  const activeUser = baseLicenses[0];
  const expiredUser = baseLicenses[2];
  const revokedUser = baseLicenses[3];
  const qaUser = createLicenseRecord({
    username: 'qa.runner',
    displayName: 'QA Runner',
    companyId: 'QA-9001',
    daysValid: 7,
    issuedAt: nowIso,
    notes: 'נוצר בבדיקה עצמית',
  });
  const renewedExpired = extendLicenseRecord(expiredUser, 10, nowIso);

  const scenarios: LicenseTestStep[] = [
    {
      name: 'רישיון פעיל עובר אימות',
      passed: validateLicenseAccess({ username: activeUser.username, key: activeUser.key, licenses: baseLicenses, nowIso }).ok,
      details: activeUser.username,
    },
    {
      name: 'שם משתמש שגוי נחסם',
      passed: validateLicenseAccess({ username: 'wrong.user', key: activeUser.key, licenses: baseLicenses, nowIso }).reason === 'username-mismatch',
      details: 'username mismatch',
    },
    {
      name: 'מפתח שגוי נחסם',
      passed: validateLicenseAccess({ username: activeUser.username, key: `${activeUser.key}broken`, licenses: baseLicenses, nowIso }).reason === 'invalid-signature',
      details: 'signature mismatch',
    },
    {
      name: 'רישיון שפג תוקפו נחסם',
      passed: validateLicenseAccess({ username: expiredUser.username, key: expiredUser.key, licenses: baseLicenses, nowIso }).reason === 'expired',
      details: expiredUser.username,
    },
    {
      name: 'רישיון מבוטל נחסם',
      passed: validateLicenseAccess({ username: revokedUser.username, key: revokedUser.key, licenses: baseLicenses, nowIso }).reason === 'revoked',
      details: revokedUser.username,
    },
    {
      name: 'הקצאת משתמש חדש עוברת אימות',
      passed: validateLicenseAccess({ username: qaUser.username, key: qaUser.key, licenses: [...baseLicenses, qaUser], nowIso }).ok,
      details: qaUser.username,
    },
    {
      name: 'חידוש רישיון ישן מחזיר אותו לפעילות',
      passed: validateLicenseAccess({ username: renewedExpired.username, key: renewedExpired.key, licenses: [...baseLicenses.filter(item => item.id !== renewedExpired.id), renewedExpired], nowIso }).ok,
      details: renewedExpired.username,
    },
  ];

  return {
    passed: scenarios.every(step => step.passed),
    runAt: nowIso,
    steps: scenarios,
  };
}