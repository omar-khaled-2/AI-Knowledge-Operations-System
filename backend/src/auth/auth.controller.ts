import {
  All,
  Controller,
  Logger,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { toNodeHandler } from 'better-auth/node';

@Controller('/api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @All('*')
  async handleAuth(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { method, path } = req;
    this.logger.debug(`Auth request: ${method} ${path}`);
    
    const handler = toNodeHandler(this.authService.auth);
    return handler(req, res);
  }
}
