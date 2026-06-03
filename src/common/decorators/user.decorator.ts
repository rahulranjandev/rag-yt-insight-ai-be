import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthUser = createParamDecorator(
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  (data: unknown | undefined, ctx: ExecutionContext) => {
    const request: ContextualRequest = ctx.switchToHttp().getRequest();
    return (request.user?.id ?? null) as string | null;
  },
);
