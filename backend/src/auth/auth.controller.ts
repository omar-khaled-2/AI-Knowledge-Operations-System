import {
  All,
  Controller,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { toNodeHandler } from 'better-auth/node';

@Controller('/api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @All('*')
  async handleAuth(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const handler = toNodeHandler(this.authService.auth);
    return handler(req, res);
  }
}
