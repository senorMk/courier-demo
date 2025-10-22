import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SetMetadata } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const MANAGING_DIRECTOR_ONLY = ['managing-director'];

@Controller('api/v1/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SetMetadata('roles', MANAGING_DIRECTOR_ONLY)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createBackOfficeUser(createUserDto);
  }

  @Get()
  getAllUsers(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.usersService.getAllBackOfficeUsers(
      Number(page),
      Number(pageSize),
    );
  }

  @Get('roles')
  getAllRoles() {
    return this.usersService.getAllRoles();
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Put(':id')
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateBackOfficeUser(id, updateUserDto);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteBackOfficeUser(id);
  }
}
