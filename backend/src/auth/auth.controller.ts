import { Controller, Post, Body, UseGuards, HttpCode } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./local-auth.guard";

export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  email: string;

  @ApiProperty({ example: "password123" })
  password: string;
}

@Controller("api/v1/auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}
