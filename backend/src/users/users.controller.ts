import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
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
  constructor(private readonly usersService: UsersService) {}

  /**
   * Safely extract and validate the user ID from the auth session.
   */
  private getUserId(user: any): string {
    if (!user) {
      throw new UnauthorizedException("User not authenticated");
    }

    const userId = user.id || user._id || user.userId;

    if (!userId) {
      throw new UnauthorizedException("User ID not found in session");
    }

    const idString = userId.toString();

    if (!Types.ObjectId.isValid(idString)) {
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
    const profile = await this.usersService.findById(userId);
    if (!profile) {
      throw new UnauthorizedException("User profile not found");
    }
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

    // Prevent users from changing their googleId via this endpoint
    if (updateUserDto.googleId) {
      delete updateUserDto.googleId;
    }

    const updated = await this.usersService.update(userId, updateUserDto);
    if (!updated) {
      throw new UnauthorizedException("User profile not found");
    }
    return plainToInstance(UserResponseDto, updated);
  }
}
