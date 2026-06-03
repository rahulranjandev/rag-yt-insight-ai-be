import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from '@app/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  findById(id: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .getOneOrFail();
  }

  async getTrustedAuthUser(payload: TokenPayload): Promise<Partial<User>> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.isActive'])
      .where('user.id = :id', { id: payload.id })
      .andWhere('user.isDeleted = :isDeleted', { isDeleted: false })
      .getOne();

    if (!user) {
      throw new BadRequestException('User not found, please login again');
    }

    return {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.password'])
      .where('user.email = :email', { email: loginDto.email })
      .getOne();

    if (!user) {
      throw new BadRequestException(
        'Email is not registered, please sign up first',
      );
    }

    const match = await user.comparePassword(loginDto.password);
    if (!match) {
      throw new UnauthorizedException('Wrong password');
    }

    const payload: TokenPayload = {
      id: user.id,
    };

    const access_token = await this.generateAccessToken(payload);
    const refresh_token = await this.generateRefreshToken(user.id);

    return {
      access_token,
      refresh_token,
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.email'])
      .where('user.email = :email', { email: registerDto.email })
      .getOne();

    if (existingUser) {
      throw new BadRequestException(
        'Email is already registered, please login instead',
      );
    }

    const newUser = this.userRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      isActive: false,
    });

    await this.userRepository.save(newUser);

    if (newUser.id) {
      const payload: TokenPayload = {
        id: newUser.id,
      };

      const access_token = await this.generateAccessToken(payload);
      const refresh_token = await this.generateRefreshToken(newUser.id);

      return {
        access_token,
        refresh_token,
      };
    } else {
      throw new BadRequestException('Failed to create user, please try again');
    }
  }

  profile(id: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.email'])
      .where('user.id = :id', { id })
      .getOneOrFail();
  }

  async generateAccessToken(payload: TokenPayload) {
    const token = await this.jwtService.signAsync(payload);
    return token;
  }

  async generateRefreshToken(userId: string) {
    const token = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.config.get(`WEB.REFRESH_TOKEN`),
        expiresIn: this.config.get(`WEB.REFRESH_TOKEN_EXPIRATION_TIME`),
      },
    );

    const authUser = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!authUser) {
      throw new BadRequestException('User not found');
    }

    const hashToken = await authUser.hashRefreshToken(token);

    authUser.refresh_token = hashToken;

    await authUser.save();

    return token;
  }

  async validateAndGenerateRefreshToken(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: this.config.get(`WEB.REFRESH_TOKEN`),
    });

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user || !user.refresh_token) {
      throw new ForbiddenException('Invalid refresh token');
    }
    await user.verifyRefreshToken(refreshToken, user.refresh_token);

    const token = await this.generateAccessToken({
      id: user.id,
    });
    return token;
  }

  /** Update user profile Service */
  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const { email, name, profileImage } = updateProfileDto;

    // 1. Find user
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(
        `Unable to find user, please try again later`,
      );
    }

    // 2. Handle email update
    if (email) {
      await this.handleEmailUpdate(user, email);
    }

    // 3. Handle profile image upload
    if (profileImage) {
      user.profileImage = profileImage;
    }

    // 4. Update name if provided
    if (name) {
      user.name = name;
    }

    // 5. Save and return
    return this.userRepository.save(user);
  }

  /**
   * Handle email update and uniqueness validation
   */
  private async handleEmailUpdate(user: User, newEmail: string): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: { email: newEmail },
    });

    if (existingUser && existingUser.id !== user.id) {
      throw new BadRequestException(
        `Email is already registered, please use a different email`,
      );
    }

    if (user.email !== newEmail) {
      user.email = newEmail;
    }
  }
}
