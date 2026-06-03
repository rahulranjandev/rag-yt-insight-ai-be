import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
  Patch,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { WebJwtAuthGuard } from './guards/web-jwt-auth.guard';
import { AuthUser } from '@app/common/decorators/user.decorator';
import { Public } from '@app/common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Public()
  @ApiOperation({
    summary: 'Login User',
    description:
      'Rate limited to 3 requests per minute to prevent brute force attacks',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Returns access and refresh tokens.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email is not registered.' })
  @ApiUnauthorizedResponse({ description: 'Wrong password.' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register User' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({
    description: 'Creates a user and returns access and refresh tokens.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email already registered.' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(WebJwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get User Profile' })
  @ApiOkResponse({ description: 'Returns the authenticated user profile.' })
  @ApiBadRequestResponse({ description: 'User not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  getProfile(@Req() req: ContextualRequest) {
    if (req.user?.id) {
      return this.authService.findById(req.user.id);
    } else {
      throw new BadRequestException('User not found');
    }
  }

  /** Update user profile */
  @UseGuards(WebJwtAuthGuard)
  @ApiBearerAuth()
  @Patch('profile/:id')
  @ApiOperation({ summary: 'Update User Profile' })
  @ApiParam({
    name: 'id',
    description: 'Authenticated user ID.',
    example: '5b7cfd5d-65e4-45a4-a0be-d8a284793baf',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiOkResponse({ description: 'Returns the updated user profile.' })
  @ApiUnauthorizedResponse({
    description: 'Cannot update another user or JWT is invalid.',
  })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req: ContextualRequest,
  ) {
    if (id !== req.user?.id) {
      throw new UnauthorizedException(
        "Access denied: cannot update another user's profile",
      );
    }
    return this.authService.updateProfile(id, updateProfileDto);
  }

  @UseGuards(WebJwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get Authenticated User Summary' })
  @ApiOkResponse({ description: 'Returns the authenticated user summary.' })
  @ApiBadRequestResponse({ description: 'User not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  getMe(@AuthUser() userId: string) {
    if (userId) {
      return this.authService.profile(userId);
    } else {
      throw new BadRequestException('User not found');
    }
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Returns a new access token.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid.' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async refresh(@Body() body: RefreshTokenDto) {
    const access_token = await this.authService.validateAndGenerateRefreshToken(
      body.refreshToken,
    );
    return { access_token };
  }
}
