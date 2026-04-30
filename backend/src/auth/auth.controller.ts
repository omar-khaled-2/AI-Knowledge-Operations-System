import {
  All,
  Controller,
  Req,
  Res,
  Next,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { toNodeHandler } from 'better-auth/node';

@Controller('/api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @All('*')
  async handleAuth(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    const handler = toNodeHandler(this.authService.auth);
    return handler(req, res);
  }
}
