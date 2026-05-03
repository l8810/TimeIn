import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TimeEntry, CreateTimeEntryRequest, UpdateTimeEntryRequest,
  TimeEntryFilter, ActiveTimer, TimerStartRequest
} from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TimeEntryService {
  private base = `${environment.apiUrl}/timeentries`;

  constructor(private http: HttpClient) {}

  getAll(filter?: TimeEntryFilter): Observable<TimeEntry[]> {
    let params = new HttpParams();
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params = params.set(k, v);
      });
    }
    return this.http.get<TimeEntry[]>(this.base, { params });
  }

  getById(id: number): Observable<TimeEntry> {
    return this.http.get<TimeEntry>(`${this.base}/${id}`);
  }

  create(req: CreateTimeEntryRequest): Observable<{ entry: TimeEntry; warning?: string }> {
    return this.http.post<{ entry: TimeEntry; warning?: string }>(this.base, req);
  }

  update(id: number, req: UpdateTimeEntryRequest): Observable<TimeEntry> {
    return this.http.put<TimeEntry>(`${this.base}/${id}`, req);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getActiveTimer(): Observable<ActiveTimer | null> {
    return this.http.get<ActiveTimer | null>(`${this.base}/timer/active`);
  }

  startTimer(req: TimerStartRequest): Observable<ActiveTimer> {
    return this.http.post<ActiveTimer>(`${this.base}/timer/start`, req);
  }

  pauseTimer(): Observable<ActiveTimer> {
    return this.http.post<ActiveTimer>(`${this.base}/timer/pause`, {});
  }

  resumeTimer(): Observable<ActiveTimer> {
    return this.http.post<ActiveTimer>(`${this.base}/timer/resume`, {});
  }

  stopTimer(description?: string): Observable<TimeEntry> {
    return this.http.post<TimeEntry>(`${this.base}/timer/stop`, { description });
  }

  submit(id: number): Observable<TimeEntry> {
    return this.http.patch<TimeEntry>(`${this.base}/${id}/submit`, {});
  }

  approve(id: number): Observable<TimeEntry> {
    return this.http.patch<TimeEntry>(`${this.base}/${id}/approve`, {});
  }

  reject(id: number, reason?: string): Observable<TimeEntry> {
    return this.http.patch<TimeEntry>(`${this.base}/${id}/reject`, { reason });
  }
}
