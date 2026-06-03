import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'web-jwt') {
  constructor(
    private authService: AuthService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('WEB_JWT_ACCESS_TOKEN_SECRET')!,
    });
  }

  async validate(payload: TokenPayload) {
    try {
      return await this.authService.getTrustedAuthUser(payload);
    } catch {
      throw new UnauthorizedException();
    }
  }
}
