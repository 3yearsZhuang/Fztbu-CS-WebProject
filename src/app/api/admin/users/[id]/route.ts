/**
 * @file 管理员用户详情 API — GET/PUT/DELETE /api/admin/users/[id]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import {
  clearAuthCookies,
  normalizeError,
  proxyBackend,
  setAuthCookies,
  toSafeUserFromBackend,
  type BackendUser,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, { path: `/admin/users/${encodeURIComponent(id)}` });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ error: '用户不存在' }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = proxy.body as { user?: BackendUser; roles?: string[] };
  const res = NextResponse.json({
    user: body.user ? toSafeUserFromBackend(body.user, body.roles) : null,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/admin/users/${encodeURIComponent(id)}`,
    method: 'PUT',
    jsonBody: {
      displayName: body.displayName,
      bio: body.bio,
      techTags: Array.isArray(body.techTags) ? body.techTags : undefined,
      githubUrl: body.githubUrl,
      websiteUrl: body.websiteUrl,
      role: typeof body.role === 'string' ? body.role : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '更新失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  // Backend returns AdminUserOut directly; accept both direct and wrapped payloads.
  const payload = proxy.body as BackendUser & { user?: BackendUser; roles?: string[] };
  const backendUser = payload.user ?? payload;
  const res = NextResponse.json({
    user: backendUser?.id != null ? toSafeUserFromBackend(backendUser, payload.roles) : null,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/admin/users/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '删除失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
