import { Controller, Post, Body, UseGuards } from "@nestjs/common";
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

  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(@Body() body: LoginDto) {
    // The user will be attached to req by the LocalAuthGuard
    // But for OpenAPI and clarity, we accept email/password in the body
    return this.authService.login(body);
  }
}
