import { Controller, Get, UseGuards } from '@nestjs/common';
import { User } from './users/schemas/user.schema';
import { AuthGuard } from './auth/guards/auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get()
  root() {
    return { message: 'AI Knowledge Operations API' };
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@CurrentUser() user: User) {
    return { user };
  }
}
