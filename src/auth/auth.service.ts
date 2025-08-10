import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private logsService: LogsService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    const isMatch = user && (await bcrypt.compare(pass, user.password));
    await this.logsService.logLoginAttempt(username, !!isMatch);
    if (isMatch) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    await this.logsService.logAction(user.username, 'login');
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
