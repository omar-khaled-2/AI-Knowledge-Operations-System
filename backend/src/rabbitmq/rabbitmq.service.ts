import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchange: string;
  private readonly url: string;
  private connecting = false;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('app.rabbitmqUrl') || 'amqp://localhost:5672';
    this.exchange = this.configService.get<string>('app.rabbitmqExchange') || 'documents';
  }

  async connect(): Promise<amqp.Channel> {
    if (this.channel) {
      return this.channel;
    }

    if (this.connecting) {
      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.connect();
    }

    this.connecting = true;

    try {
      this.logger.log(`Connecting to RabbitMQ at ${this.url}`);
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });

      this.logger.log(`Connected to RabbitMQ, exchange: ${this.exchange}`);

      // Handle connection errors
      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err.message);
        this.cleanup();
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        this.cleanup();
      });

      return this.channel;
    } catch (error) {
      this.logger.error(
        'Failed to connect to RabbitMQ',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    } finally {
      this.connecting = false;
    }
  }

  async publish(
    routingKey: string,
    message: Record<string, any>,
    options?: amqp.Options.Publish,
  ): Promise<boolean> {
    try {
      const channel = await this.connect();
      const buffer = Buffer.from(JSON.stringify(message));

      const published = channel.publish(this.exchange, routingKey, buffer, {
        persistent: true,
        contentType: 'application/json',
        ...options,
      });

      if (published) {
        this.logger.debug(`Published message to ${routingKey}`, { exchange: this.exchange });
      }

      return published;
    } catch (error) {
      this.logger.error(
        `Failed to publish message to ${routingKey}`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  private cleanup(): void {
    this.channel = null;
    this.connection = null;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing RabbitMQ connection');
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection', error);
    }
  }
}
