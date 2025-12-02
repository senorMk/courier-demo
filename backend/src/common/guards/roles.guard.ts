import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const allowedRoles =
      this.reflector.get<string[]>("roles", context.getHandler()) || [];

    if (
      !user ||
      (allowedRoles.length > 0 && !allowedRoles.includes(user.role))
    ) {
      throw new ForbiddenException(
        "You do not have permission to perform this action"
      );
    }
    return true;
  }
}
