import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { Types } from "mongoose";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";

/**
 * Users Controller - IDOR Protected
 *
 * Security: This controller ONLY exposes endpoints for managing the
 * authenticated user's own profile. There are no endpoints to list,
 * search, or access other users' data, preventing IDOR attacks
 * and information disclosure.
 */
@Controller("users")
@UseGuards(AuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Safely extract and validate the user ID from the auth session.
   */
  private getUserId(user: any): string {
    if (!user) {
      this.logger.warn('Authentication failed: user not found in request');
      throw new UnauthorizedException("User not authenticated");
    }

    const userId = user.id || user._id || user.userId;

    if (!userId) {
      this.logger.warn('Authentication failed: user ID not found in session');
      throw new UnauthorizedException("User ID not found in session");
    }

    const idString = userId.toString();

    if (!Types.ObjectId.isValid(idString)) {
      this.logger.warn(`Invalid user ID format: ${idString}`);
      throw new BadRequestException(`Invalid user ID format: ${idString}`);
    }

    return idString;
  }

  /**
   * Get the current authenticated user's profile.
   * IDOR-safe: Always returns the requesting user's own data.
   */
  @Get("me")
  async getMe(@CurrentUser() user: any) {
    const userId = this.getUserId(user);
    this.logger.debug(`Fetching current user profile: userId=${userId}`);
    
    const profile = await this.usersService.findById(userId);
    if (!profile) {
      this.logger.warn(`User profile not found: userId=${userId}`);
      throw new UnauthorizedException("User profile not found");
    }
    
    this.logger.log(`Retrieved user profile: userId=${userId}`);
    return plainToInstance(UserResponseDto, profile);
  }

  /**
   * Update the current authenticated user's profile.
   * IDOR-safe: Only updates the requesting user's own data.
   */
  @Patch("me")
  async updateMe(
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);
    this.logger.log(`Updating user profile: userId=${userId}`);

    // Prevent users from changing their googleId via this endpoint
    if (updateUserDto.googleId) {
      this.logger.warn(`Attempt to modify googleId blocked: userId=${userId}`);
      delete updateUserDto.googleId;
    }

    const updated = await this.usersService.update(userId, updateUserDto);
    if (!updated) {
      this.logger.warn(`User profile not found for update: userId=${userId}`);
      throw new UnauthorizedException("User profile not found");
    }
    
    this.logger.log(`User profile updated successfully: userId=${userId}`);
    return plainToInstance(UserResponseDto, updated);
  }
}
