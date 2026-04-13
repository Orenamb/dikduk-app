import { describe, expect, it } from 'vitest';
import {
  ADMIN_ACCESS_CODE,
  PRODUCT_CODE,
  createAdminSession,
  createLicenseRecord,
  createSeedLicenses,
  createSessionFromRecord,
  extendLicenseRecord,
  parseLicenseKey,
  runLicenseSelfTest,
  validateLicenseAccess,
} from './licenseSystem';

describe('license system', () => {
  it('creates a signed key that can be parsed', () => {
    const record = createLicenseRecord({
      username: 'demo.user',
      displayName: 'Demo User',
      companyId: 'DEMO-1',
      daysValid: 5,
      issuedAt: '2026-04-13T10:00:00.000Z',
    });

    const parsed = parseLicenseKey(record.key);
    expect(parsed?.payload.product).toBe(PRODUCT_CODE);
    expect(parsed?.payload.username).toBe('demo.user');
  });

  it('accepts active records and rejects expired/revoked ones', () => {
    const nowIso = '2026-04-13T10:00:00.000Z';
    const licenses = createSeedLicenses(nowIso);

    expect(validateLicenseAccess({ username: licenses[0].username, key: licenses[0].key, licenses, nowIso }).ok).toBe(true);
    expect(validateLicenseAccess({ username: licenses[2].username, key: licenses[2].key, licenses, nowIso }).reason).toBe('expired');
    expect(validateLicenseAccess({ username: licenses[3].username, key: licenses[3].key, licenses, nowIso }).reason).toBe('revoked');
  });

  it('renews an expired license with a fresh key', () => {
    const nowIso = '2026-04-13T10:00:00.000Z';
    const expired = createSeedLicenses(nowIso)[2];
    const renewed = extendLicenseRecord(expired, 15, nowIso);
    expect(renewed.key).not.toBe(expired.key);
    expect(validateLicenseAccess({ username: renewed.username, key: renewed.key, licenses: [renewed], nowIso }).ok).toBe(true);
  });

  it('creates user and admin sessions', () => {
    const record = createLicenseRecord({
      username: 'learner.one',
      displayName: 'Learner One',
      companyId: 'SCH-1',
      daysValid: 30,
      issuedAt: '2026-04-13T10:00:00.000Z',
    });

    expect(createSessionFromRecord(record).role).toBe('user');
    expect(createAdminSession().key).toBe(ADMIN_ACCESS_CODE);
  });

  it('runs a passing self-test report', () => {
    const report = runLicenseSelfTest('2026-04-13T10:00:00.000Z');
    expect(report.passed).toBe(true);
    expect(report.steps).toHaveLength(7);
    expect(report.steps.every(step => step.passed)).toBe(true);
  });
});