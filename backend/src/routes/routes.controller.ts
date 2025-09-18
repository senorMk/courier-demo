import { Query, Get } from "@nestjs/common";
import {
  Body,
  Controller,
  Post,
  UseGuards,
  SetMetadata,
  BadRequestException,
  Param,
  Put,
  Delete,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoutesService } from "./routes.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { OfficeType } from "@prisma/client";

@Controller("api/v1/routes")
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post("create")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async createRoute(@Body() body: { code: string; name: string }) {
    return this.routesService.createRoute(body);
  }

  @Get("paginated")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async getPaginated(
    @Query("page") page: number = 1,
    @Query("pageSize") pageSize: number = 10
  ) {
    return this.routesService.getRoutesPaginated(
      Number(page),
      Number(pageSize)
    );
  }

  @Get("search")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async searchRoutes(@Query("q") q: string) {
    if (!q || q.trim().length === 0) {
      return [];
    }
    return this.routesService.searchRoutes(q);
  }

  @Post("office/create")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async createOffice(
    @Body()
    body: {
      branchCode: string;
      officeTypes: OfficeType[];
      routeId: string;
      name: string;
    }
  ) {
    return this.routesService.createOffice(body);
  }

  @Get("offices/paginated")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async getOfficesPaginated(
    @Query("page") page: number = 1,
    @Query("pageSize") pageSize: number = 10
  ) {
    return this.routesService.getOfficesPaginated(
      Number(page),
      Number(pageSize)
    );
  }

  /**
   * Search offices by branch code, office type, or name
   * @param query search string
   */
  @Get("offices/search")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async searchOffices(@Query("q") q: string) {
    // if (!q || q.trim().length === 0) {
    //   return [];
    // }
    return this.routesService.searchOffices(q);
  }

  @Get("offices/:id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async getOffice(@Param('id') id: string) {
    return this.routesService.getOffice(id);
  }

  @Put("offices/:id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async updateOffice(
    @Param('id') id: string,
    @Body()
    body: {
      branchCode?: string;
      officeTypes?: OfficeType[];
      routeId?: string;
      name?: string;
    }
  ) {
    return this.routesService.updateOffice(id, body);
  }

  @Delete("offices/:id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async deleteOffice(@Param('id') id: string) {
    return this.routesService.deleteOffice(id);
  }
}
