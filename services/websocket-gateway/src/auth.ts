import type { ServerConfig } from './types';

export interface AuthResult {
  userId: string;
  session: any;
}

export class AuthService {
  constructor(private config: ServerConfig) {}

  /**
   * Validate Better-Auth session from cookie.
   * For MVP: extracts userId from JWT payload.
   * In production: should call Better-Auth API to validate session.
   */
  async validateSession(cookieHeader: string | undefined): Promise<AuthResult | null> {
    if (!cookieHeader) {
      console.log('[Auth] No cookie provided');
      return null;
    }

    const sessionMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;

    if (!sessionToken) {
      console.log('[Auth] No session token found in cookie');
      return null;
    }

    try {
      // MVP: Extract userId from JWT payload
      // TODO: Replace with actual Better-Auth validation API call
      const userId = this.extractUserIdFromToken(sessionToken);
      
      if (!userId) {
        console.log('[Auth] Could not extract userId from token');
        return null;
      }

      return { userId, session: { token: sessionToken } };
    } catch (error) {
      console.error('[Auth] Validation error:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return `user_${token.substring(0, 8)}`;
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.sub || payload.userId || payload.id || null;
    } catch {
      return `user_${token.substring(0, 8)}`;
    }
  }
}
