import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const headers = new Headers();

    // Copy headers from Express request to Web API Headers
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else if (typeof value === 'string') {
          headers.set(key, value);
        }
      }
    }

    const session = await this.authService.auth.api.getSession({
      headers,
    });

    if (!session) {
      this.logger.warn(
        `Unauthorized access attempt: ${request.method} ${request.path}`,
      );
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Attach user and session to request for later use
    (request as any).user = session.user;
    (request as any).session = session.session;

    return true;
  }
}
