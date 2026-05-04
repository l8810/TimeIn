import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GitCommit {
  commitId?: number;
  hash: string;
  shortHash: string;
  message: string;
  authorName: string;
  authorEmail?: string;
  date: string;
  url: string;
  linkedUserId?: number;
  linkedUserName?: string;
  linkedTaskId?: number;
  linkedTaskName?: string;
  linkedTimeEntryId?: number;
  matchedTaskId?: string;
}

export interface GitGap {
  userId: number;
  fullName: string;
  date: string;
  hasTimeEntry: boolean;
  hasCommit: boolean;
  commitCount: number;
  loggedHours: number;
}

@Injectable({ providedIn: 'root' })
export class GitService {
  private base = `${environment.apiUrl}/git`;

  constructor(private http: HttpClient) {}

  getCommits(from?: Date, to?: Date, userId?: number): Observable<GitCommit[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from.toISOString());
    if (to) params = params.set('to', to.toISOString());
    if (userId) params = params.set('userId', userId);
    return this.http.get<GitCommit[]>(`${this.base}/commits`, { params });
  }

  linkCommit(data: any): Observable<GitCommit> {
    return this.http.post<GitCommit>(`${this.base}/commits/link`, data);
  }

  unlinkCommit(hash: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/commits/link/${hash}`);
  }

  getGaps(from: Date, to: Date): Observable<GitGap[]> {
    const params = new HttpParams()
      .set('from', from.toISOString())
      .set('to', to.toISOString());
    return this.http.get<GitGap[]>(`${this.base}/gaps`, { params });
  }

  getTaskCommitCounts(): Observable<Record<number, number>> {
    return this.http.get<Record<number, number>>(`${this.base}/commits/task-counts`);
  }

  getCommitsByTask(taskId: number): Observable<GitCommit[]> {
    return this.http.get<GitCommit[]>(`${this.base}/commits/task/${taskId}`);
  }

  getStatus(): Observable<{ configured: boolean; repo: string }> {
    return this.http.get<any>(`${this.base}/status`);
  }
}
