import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ReportingRules, UpdateReportingRulesRequest } from '../models/models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportingRulesService {
  private readonly apiUrl = `${environment.apiUrl}/ReportingRules`;

  constructor(private http: HttpClient) {}

  get(): Observable<ReportingRules> {
    return this.http.get<ReportingRules>(this.apiUrl);
  }

  update(req: UpdateReportingRulesRequest): Observable<ReportingRules> {
    return this.http.put<ReportingRules>(this.apiUrl, req);
  }
}
