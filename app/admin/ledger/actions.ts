'use server';

import * as https from 'https';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ACCESS_COOKIE_NAME, verifyAccessToken } from '@/lib/auth-tokens';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace(/[\r\n]+/g, '')
  .replace(/\/+$/g, '')
  .trim();

const SERVICE_ROLE = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')
  .replace(/[\r\n]+/g, '')
  .trim();


async function requireAdminByAccessToken() {
  const token = cookies().get(ACCESS_COOKIE_NAME)?.value;
  if (!token) throw new Error('관리자 권한이 필요합니다.');

  const session = await verifyAccessToken(token);
  if (!session || session.role !== 'ADMIN') {
    throw new Error('관리자 권한이 필요합니다.');
  }

  // 토큰만 믿지 않고 DB의 현재 role도 한 번 더 확인한다.
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { role: true },
  });

  if (user?.role !== 'ADMIN') {
    throw new Error('관리자 권한이 필요합니다.');
  }
}

// Supabase REST에 DELETE 호출 (Service Role; 브라우저에 노출되지 않음)
function httpsDelete(urlStr: string, headers: Record<string, string>) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const req = https.request(
        {
          method: 'DELETE',
          hostname: u.hostname,
          path: u.pathname + u.search,
          headers,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (d) => chunks.push(d as Buffer));
          res.on('end', () =>
            resolve({ status: res.statusCode || 0, text: Buffer.concat(chunks).toString('utf8') })
          );
        }
      );
      req.on('error', reject);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function deleteLedgerEntries(params: {
  scope: 'all' | 'date' | 'name';
  date_from?: string;
  date_to?: string;
  customer_name?: string;
}) {
  await requireAdminByAccessToken();

  if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('ENV missing');

  const base = `${SUPABASE_URL}/rest/v1/ledger_entries`;
  const u = new URL(base);

  if (params.scope === 'all') {
    // PostgREST는 무필터 DELETE를 막음 → not.is.null 같은 필터를 넣어야 함
    u.searchParams.set('erp_row_key', 'not.is.null');
  } else if (params.scope === 'date') {
    if (!params.date_from || !params.date_to) throw new Error('date_from/date_to required');
    u.searchParams.set('tx_date', `gte.${params.date_from}`);
    u.searchParams.append('tx_date', `lte.${params.date_to}`);
  } else if (params.scope === 'name') {
    if (!params.customer_name) throw new Error('customer_name required');
    // 공백/한글 대응 위해 인코딩
    u.searchParams.set('customer_name', `eq.${encodeURIComponent(params.customer_name)}`);
  }

  const headers: Record<string, string> = {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    Prefer: 'return=minimal',
  };

  const { status, text } = await httpsDelete(u.toString(), headers);
  if (status < 200 || status >= 300) {
    throw new Error(`delete fail ${status}: ${text}`);
  }
}

// ===== 공개 서버 액션들 =====
export async function clearAll() {
  await deleteLedgerEntries({ scope: 'all' });
}

export async function clearRange(formData: FormData) {
  const from = String(formData.get('date_from') ?? '');
  const to = String(formData.get('date_to') ?? '');
  await deleteLedgerEntries({ scope: 'date', date_from: from, date_to: to });
}

export async function clearByName(formData: FormData) {
  const name = String(formData.get('customer_name') ?? '');
  await deleteLedgerEntries({ scope: 'name', customer_name: name });
}
