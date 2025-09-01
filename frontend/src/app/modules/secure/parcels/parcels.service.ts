import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface Parcel {
  id?: string;
  parcelNumber?: number;
  customerId: string;
  receiverId: string;
  destinationId: string;
}

export interface CustomerPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress?: string;
  idNumber?: string;
}

export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'CARD';

export interface ParcelItem {
  id?: string;
  quantity: number;
  description: string;
  pricePerUnit: number;
  value: number;
  amount: number;
}

@Injectable()
export class ParcelsService {
  private baseUrl = environment.serverURL;
  constructor(private _httpClient: HttpClient) {}

  getParcels(
    pageIndex = 0,
    pageSize = 10
  ): Observable<{ data: Parcel[]; total: number }> {
    const params = `?page=${pageIndex}&size=${pageSize}`;
    return this._httpClient.get<{ data: Parcel[]; total: number }>(
      `${this.baseUrl}/v1/parcels/paginated${params}`
    );
  }

  getParcelItems(parcelId: string): Observable<ParcelItem[]> {
    return this._httpClient.get<ParcelItem[]>(`${this.baseUrl}/v1/parcels/${parcelId}/items`);
  }

  createParcel(
    data:
      | {
          customerId: string;
          receiverId: string;
          officeId: string;
          size?: string;
          payment?: { method: PaymentMethod; amount: number; reference?: string };
        }
      | {
          customer: CustomerPayload;
          receiver: CustomerPayload;
          officeId: string;
          size: 'SMALL' | 'MEDIUM' | 'LARGE';
          payment: { method: PaymentMethod; amount: number; reference?: string };
        }
  ): Observable<Parcel> {
    return this._httpClient.post<Parcel>(
      `${this.baseUrl}/v1/parcels/create`,
      data
    );
  }

  downloadReceiptsZip(parcelId: string): Observable<Blob> {
    const url = `${this.baseUrl}/v1/parcels/${parcelId}/receipts/download`;
    return this._httpClient.get(url, { responseType: 'blob' });
  }

  downloadReceipt(parcelId: string, type: 'sender' | 'sticker' | 'accounts'): Observable<Blob> {
    const url = `${this.baseUrl}/v1/parcels/${parcelId}/receipts/${type}`;
    return this._httpClient.get(url, { responseType: 'blob' });
  }

  createParcelItem(
    parcelId: string,
    data: ParcelItem
  ): Observable<ParcelItem> {
    return this._httpClient.post<ParcelItem>(
      `${this.baseUrl}/v1/parcels/${parcelId}/items`,
      data
    );
  }
}
