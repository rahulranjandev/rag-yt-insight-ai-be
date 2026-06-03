import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@app/common/decorators/public.decorator';

@Injectable()
export class WebJwtAuthGuard extends AuthGuard('web-jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | any {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
