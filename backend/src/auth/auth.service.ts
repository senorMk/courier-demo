import { BadRequestException, Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { LogsService } from "../logs/logs.service";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private logsService: LogsService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    const isMatch = user && (await bcrypt.compare(pass, user.password));
    await this.logsService.logLoginAttempt(email, !!isMatch);
    if (isMatch) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: { email: string; password: string }) {
    // Validate user credentials
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new BadRequestException("Invalid credentials");
    }
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role?.name || user.role, // support both populated and flat role
      officeId: user.officeId || user.office?.id || null,
      firstName: (user as any).firstName || null,
      lastName: (user as any).lastName || null,
      createdAt: (user as any).createdAt || null,
      authorizedBayTypes: (user as any).authorizedBayTypes || [],
    };
    await this.logsService.logAction(user.email, "login");
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
