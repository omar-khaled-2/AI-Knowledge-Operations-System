import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AppController } from "./app.controller";
import appConfig from "./config/app.config";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { ProjectsModule } from "./projects/projects.module";
import { DocumentsModule } from "./documents/documents.module";

@Module({
  imports: [
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
        console.log(uri);
        return { uri };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    ProjectsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
