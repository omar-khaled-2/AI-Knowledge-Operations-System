import { Controller, Post, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { WebSocketTicketService } from './websocket-ticket.service';

@Controller('api/ws')
export class WebSocketTicketController {
  constructor(private readonly ticketService: WebSocketTicketService) {}

  @Post('ticket')
  @UseGuards(AuthGuard)
  async generateTicket(@Request() req) {
    // Get userId from session
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const ticket = await this.ticketService.generateTicket(userId);
    
    return { ticket };
  }
}
