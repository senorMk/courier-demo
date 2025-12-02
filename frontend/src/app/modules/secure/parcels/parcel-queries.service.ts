import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export type ParcelQueryType =
  | "GENERAL"
  | "DAMAGE"
  | "ROUTING_ISSUE"
  | "DELAY"
  | "MISSING"
  | "DELIVERY_STATUS"
  | "PAYMENT"
  | "OTHER";

export type ParcelQueryStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface ParcelQuery {
  id: string;
  parcelId: string;
  queryType: ParcelQueryType;
  description?: string | null;
  status: ParcelQueryStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  parcel?: {
    id: string;
    parcelNumber: number;
    TrackingCode?: {
      plainTextCode: string;
    } | null;
    customer?: {
      firstName?: string | null;
      lastName?: string | null;
      phoneNumber?: string | null;
    } | null;
    receiver?: {
      firstName?: string | null;
      lastName?: string | null;
      phoneNumber?: string | null;
    } | null;
    office?: {
      name: string;
      branchCode: string;
    } | null;
  };
  creator?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  events?: ParcelQueryEvent[];
}

export interface ParcelQueryEvent {
  id: string;
  queryId: string;
  action: string;
  fromStatus?: ParcelQueryStatus | null;
  toStatus?: ParcelQueryStatus | null;
  note?: string | null;
  performedBy?: string | null;
  createdAt: string;
}

export interface CreateParcelQueryRequest {
  parcelId: string;
  queryType: ParcelQueryType;
  description?: string;
}

export interface UpdateQueryStatusRequest {
  status: ParcelQueryStatus;
  note?: string;
}

export interface ParcelQueriesListResponse {
  data: ParcelQuery[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class ParcelQueriesService {
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

  createQuery(data: CreateParcelQueryRequest): Observable<ParcelQuery> {
    return this._httpClient.post<ParcelQuery>(
      `${this.baseUrl}/v1/parcel-queries/create`,
      data,
      this.getHeader()
    );
  }

  getQueries(
    pageIndex = 0,
    pageSize = 10,
    status?: ParcelQueryStatus,
    parcelId?: string
  ): Observable<ParcelQueriesListResponse> {
    const page = (pageIndex ?? 0) + 1;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (status) {
      params.set("status", status);
    }
    if (parcelId) {
      params.set("parcelId", parcelId);
    }
    return this._httpClient.get<ParcelQueriesListResponse>(
      `${this.baseUrl}/v1/parcel-queries/paginated?${params.toString()}`,
      this.getHeader()
    );
  }

  getQueryById(id: string): Observable<ParcelQuery> {
    return this._httpClient.get<ParcelQuery>(
      `${this.baseUrl}/v1/parcel-queries/${id}`,
      this.getHeader()
    );
  }

  updateQueryStatus(
    id: string,
    data: UpdateQueryStatusRequest
  ): Observable<ParcelQuery> {
    return this._httpClient.post<ParcelQuery>(
      `${this.baseUrl}/v1/parcel-queries/${id}/update-status`,
      data,
      this.getHeader()
    );
  }

  getQueryEvents(id: string): Observable<ParcelQueryEvent[]> {
    return this._httpClient.get<ParcelQueryEvent[]>(
      `${this.baseUrl}/v1/parcel-queries/${id}/events`,
      this.getHeader()
    );
  }

  getReport(
    startDate?: string,
    endDate?: string
  ): Observable<{
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    total: number;
  }> {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return this._httpClient.get<{
      open: number;
      inProgress: number;
      resolved: number;
      closed: number;
      total: number;
    }>(
      `${this.baseUrl}/v1/parcel-queries/report/summary?${params.toString()}`,
      this.getHeader()
    );
  }
}
