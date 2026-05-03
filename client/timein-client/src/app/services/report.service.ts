import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Dashboard, ManagerDashboard, AdminDashboard } from '../models/models';
import { environment } from '../../environments/environment';

export interface ReportFilter {
  userId?: number;
  projectId?: number;
  fromDate?: string;
  toDate?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private base = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.base}/dashboard`);
  }

  getManagerDashboard(): Observable<ManagerDashboard> {
    return this.http.get<ManagerDashboard>(`${this.base}/manager-dashboard`);
  }

  getAdminDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.base}/admin-dashboard`);
  }

  getUserReport(filter?: ReportFilter): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/users`, { params: this.toParams(filter) });
  }

  getProjectReport(filter?: ReportFilter): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/projects`, { params: this.toParams(filter) });
  }

  getTaskReport(filter?: ReportFilter): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/tasks`, { params: this.toParams(filter) });
  }

  getAnomalies(filter?: ReportFilter): Observable<any> {
    return this.http.get<any>(`${this.base}/anomalies`, { params: this.toParams(filter) });
  }

  getEntriesReport(filter?: ReportFilter & { userId?: number }): Observable<{ entries: any[]; totalHours: number; totalCount: number }> {
    return this.http.get<any>(`${this.base}/entries`, { params: this.toParams(filter) });
  }

  private toParams(filter?: ReportFilter): HttpParams {
    let params = new HttpParams();
    if (!filter) return params;
    Object.entries(filter).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params = params.set(k, v);
    });
    return params;
  }
}
