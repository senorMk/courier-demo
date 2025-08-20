import { Query, Get } from "@nestjs/common";
import {
  Body,
  Controller,
  Post,
  Param,
  UseGuards,
  SetMetadata,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/common/guards/roles.guard";
import { ParcelService } from "./parcel.service";

@Controller("api/v1/parcels")
export class ParcelController {
  constructor(private readonly parcelService: ParcelService) {}

  @Post("create")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async create(
    @Body()
    body: {
      customerId: string;
      receiverId: string;
      officeId: string;
    }
  ) {
    return this.parcelService.createParcel(body);
  }

  @Get("paginated")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async getPaginated(
    @Query("page") page: number = 1,
    @Query("pageSize") pageSize: number = 10
  ) {
    return this.parcelService.getParcelsPaginated(
      Number(page),
      Number(pageSize)
    );
  }

  @Post(":parcelId/items")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async addItem(
    @Param("parcelId") parcelId: string,
    @Body()
    body: {
      quantity: number;
      description: string;
      pricePerUnit: number;
      value: number;
      amount: number;
    }
  ) {
    return this.parcelService.addParcelItem(parcelId, body);
  }
}
