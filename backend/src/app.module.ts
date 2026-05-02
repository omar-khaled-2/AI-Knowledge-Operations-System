import { Logger } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AppController } from "./app.controller";
import appConfig from "./config/app.config";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { ProjectsModule } from "./projects/projects.module";
import { DocumentsModule } from "./documents/documents.module";
import { WebSocketModule } from "./websocket/websocket.module";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>("app.mongodbHost");
        const port = configService.get<number>("app.mongodbPort");
        const database = configService.get<string>("app.mongodbDatabase");
        const user = configService.get<string>("app.mongodbUser");
        const password = configService.get<string>("app.mongodbPassword");

        // Build connection URI from parts
        // If auth is enabled (user + password provided), include credentials
        const credentials =
          user && password
            ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
            : "";
        const uri = `mongodb://${credentials}${host}:${port}/${database}?authSource=admin`;
        
        return { 
          uri,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              Logger.log('MongoDB connection established successfully');
            });
            connection.on('error', (err) => {
              Logger.error('MongoDB connection error', err.message);
            });
            connection.on('disconnected', () => {
              Logger.warn('MongoDB connection disconnected');
            });
            return connection;
          }
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    ProjectsModule,
    DocumentsModule,
    WebSocketModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
