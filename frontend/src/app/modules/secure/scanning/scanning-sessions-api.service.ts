import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class ScanningSessionsService {
  async getPaginatedSessions(
    page: number = 1,
    pageSize: number = 10
  ): Promise<any> {
    const url = `/api/v1/scanning?page=${page}&pageSize=${pageSize}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch scanning sessions");
    return res.json();
  }
}
