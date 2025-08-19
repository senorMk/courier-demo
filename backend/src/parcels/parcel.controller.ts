import {
  Body,
  Controller,
  Post,
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
      destinationId: string;
    }
  ) {
    return this.parcelService.createParcel(body);
  }
}
