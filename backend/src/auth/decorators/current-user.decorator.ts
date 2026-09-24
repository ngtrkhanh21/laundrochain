import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator lấy thông tin user từ JWT payload trong request.
 *
 * @example
 * @Get('me')
 * getMe(@CurrentUser() user: JwtUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
