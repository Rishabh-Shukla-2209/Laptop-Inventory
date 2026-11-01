import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/lib/types';

/**
 * Get the current authenticated session or return a 401 response.
 */
export async function getSessionOrUnauthorized() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session, error: null };
}

/**
 * Check if the current user has the required role.
 * Role hierarchy: admin > editor > viewer
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };
  return hierarchy[userRole] >= hierarchy[requiredRole];
}

/**
 * Get session and check role, returning 403 if insufficient.
 */
export async function requireRole(requiredRole: UserRole) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return { session: null, error };

  if (!hasRole(session!.user.role, requiredRole)) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { session: session!, error: null };
}
