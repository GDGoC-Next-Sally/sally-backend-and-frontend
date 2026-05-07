import { CanActivate, Injectable, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { user_role } from ".prisma/client";
import { IS_INTERNAL_KEY } from "./internal.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const isInternal = this.reflector.getAllAndOverride<boolean>(IS_INTERNAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isInternal) return true;

    const requiredRoles = this.reflector.getAllAndOverride<user_role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // 1. ADMIN은 모든 문을 통과합니다.
    if (user.role === user_role.ADMIN) return true;

    // 2. 설정된 권한이 없다면 기본적으로 통과
    if (!requiredRoles) return true;

    // 3. 현재 유저의 역할이 허용된 리스트에 있는지 확인
    return requiredRoles.includes(user.role);
  }
}