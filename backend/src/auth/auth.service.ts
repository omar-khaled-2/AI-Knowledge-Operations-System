import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  public auth: any;

  constructor(
    @InjectConnection() private connection: Connection,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const client = this.connection.getClient();
      const db = client.db();

      this.auth = betterAuth({
        secret: this.configService.get<string>('app.betterAuthSecret'),
        baseURL: this.configService.get<string>('app.betterAuthUrl'),
        trustedOrigins: [this.configService.get<string>('app.frontendUrl')!],
        database: mongodbAdapter(db),
        socialProviders: {
          google: {
            clientId: this.configService.get<string>('app.googleClientId')!,
            clientSecret: this.configService.get<string>('app.googleClientSecret')!,
            redirectURI: this.configService.get<string>('app.googleRedirectUri')!,
          },
        },
      });

      this.logger.log('Better-Auth initialized successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Better-Auth',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
