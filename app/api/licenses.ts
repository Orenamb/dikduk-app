import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BlobNotFoundError, head, put } from '@vercel/blob';

const LICENSE_STATE_PATH = 'licenses/state.json';

async function readLicensesFromBlob(): Promise<unknown[]> {
  try {
    const metadata = await head(LICENSE_STATE_PATH);
    const response = await fetch(metadata.url, { cache: 'no-store' });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    if (error instanceof BlobNotFoundError) return [];
    throw error;
  }
}

async function writeLicensesToBlob(records: unknown[]): Promise<void> {
  await put(LICENSE_STATE_PATH, JSON.stringify(records), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const records = await readLicensesFromBlob();
      res.status(200).json({ records });
      return;
    }

    if (req.method === 'PUT') {
      const body = req.body;
      const records = Array.isArray(body?.records) ? body.records : null;
      if (!records) {
        res.status(400).json({ message: 'Expected body.records to be an array.' });
        return;
      }
      await writeLicensesToBlob(records);
      res.status(200).json({ ok: true, count: records.length });
      return;
    }

    res.setHeader('Allow', 'GET, PUT');
    res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    res.status(500).json({ message });
  }
}
