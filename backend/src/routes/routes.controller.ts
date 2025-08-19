import { Query, Get } from "@nestjs/common";
import {
  Body,
  Controller,
  Post,
  UseGuards,
  SetMetadata,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoutesService } from "./routes.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Controller("api/v1/routes")
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post("create")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async createRoute(@Body() body: { code: string; name: string }) {
    return this.routesService.createRoute(body);
  }

  @Post("office/create")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async createOffice(
    @Body()
    body: {
      branchCode: string;
      officeType: "SENDING" | "RECEIVING";
      name: string;
    }
  ) {
    return this.routesService.createOffice(body);
  }

  @Post("destination/create")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async createDestination(
    @Body()
    body: {
      code: string;
      branchCode: string;
      name: string;
      routeId: string;
    }
  ) {
    return this.routesService.createDestination(body);
  }

  @Get("destinations/paginated")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async getDestinationsPaginated(
    @Query("page") page: number = 1,
    @Query("pageSize") pageSize: number = 10
  ) {
    return this.routesService.getDestinationsPaginated(
      Number(page),
      Number(pageSize)
    );
  }

  @Get("routes/paginated")
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
}
