import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface Parcel {
  id?: string;
  parcelNumber?: number;
  customerId: string;
  receiverId: string;
  destinationId?: string;
  description?: string;
  value?: number;
  size?: "SMALL" | "MEDIUM" | "LARGE";
  status?: string;
  createdAt?: string;
  office?: { name: string; branchCode: string; officeTypes?: string[] } | null;
  sendingOffice?: { name: string; branchCode: string } | null;
  TrackingCode?: { plainTextCode: string } | null;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    emailAddress?: string | null;
    idNumber?: string | null;
  } | null;
  receiver?: {
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    emailAddress?: string | null;
    idNumber?: string | null;
  } | null;
  payment?: {
    amount?: number | null;
    method?: PaymentMethod | null;
    reference?: string | null;
    paidAt?: string | null;
  } | null;
}

export interface CustomerPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress?: string;
  idNumber?: string;
}

export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "CARD";

export interface ParcelScanHistoryEntry {
  id: string;
  scannedAt: string;
  scannedBy: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  office: {
    id: string;
    name: string;
    branchCode: string;
  } | null;
  bay: {
    id: string | null;
    name: string;
    bayType: string;
  } | null;
  route: {
    id: string;
    name: string;
    code: string;
  } | null;
  trip: {
    id: string;
    driverName: string;
    truckReg: string;
    status: string;
  } | null;
  session: {
    id: string;
    mode: string;
    startedAt: string;
    closedAt: string | null;
  };
}

export interface ParcelScanHistoryResponse {
  parcel: {
    id: string;
    trackingCode: string | null;
  };
  scans: ParcelScanHistoryEntry[];
}

@Injectable()
export class ParcelsService {
  private baseUrl = environment.serverURL;
  constructor(private _httpClient: HttpClient) {}

  getToken() {
    return localStorage.getItem("accessToken");
  }

  getHeader() {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`,
      }),
    };
    return httpOptions;
  }

  getParcels(
    pageIndex = 0,
    pageSize = 10,
    search?: string
  ): Observable<{ data: Parcel[]; total: number }> {
    const page = (pageIndex ?? 0) + 1;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search && search.trim()) {
      params.set("search", search.trim());
    }
    return this._httpClient.get<{ data: Parcel[]; total: number }>(
      `${this.baseUrl}/v1/parcels/paginated?${params.toString()}`,
      this.getHeader()
    );
  }

  createParcel(
    data:
      | {
          customerId: string;
          receiverId: string;
          officeId: string;
          description: string;
          value: number;
          size?: string;
          payment?: {
            method: PaymentMethod;
            amount: number;
            reference?: string;
          };
        }
      | {
          customer: CustomerPayload;
          receiver: CustomerPayload;
          officeId: string;
          description: string;
          value: number;
          size: "SMALL" | "MEDIUM" | "LARGE";
          payment: {
            method: PaymentMethod;
            amount: number;
            reference?: string;
          };
        }
  ): Observable<Parcel> {
    return this._httpClient.post<Parcel>(
      `${this.baseUrl}/v1/parcels/create`,
      data,
      this.getHeader()
    );
  }

  downloadReceiptsZip(parcelId: string): Observable<Blob> {
    const url = `${this.baseUrl}/v1/parcels/${parcelId}/receipts/download`;
    return this._httpClient.get(url, {
      responseType: "blob",
      ...this.getHeader(),
    });
  }

  downloadReceipt(
    parcelId: string,
    type: "sender" | "sticker" | "accounts"
  ): Observable<Blob> {
    const url = `${this.baseUrl}/v1/parcels/${parcelId}/receipts/${type}`;
    return this._httpClient.get(url, {
      responseType: "blob",
      ...this.getHeader(),
    });
  }

  getParcelTrackHistory(parcelId: string): Observable<ParcelScanHistoryResponse> {
    return this._httpClient.get<ParcelScanHistoryResponse>(
      `${this.baseUrl}/v1/parcels/${parcelId}/track`,
      this.getHeader()
    );
  }

  markCollected(parcelId: string) {
    return this._httpClient.post(
      `${this.baseUrl}/v1/parcels/${parcelId}/collect`,
      {},
      this.getHeader()
    );
  }
}
