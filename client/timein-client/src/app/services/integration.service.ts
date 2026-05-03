import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProjectMapping {
  projectId: number;
  projectName: string;
  clickUpListId?: string;
  lastSyncedAt?: string;
  tasksSynced?: number;
}

export interface ClickUpStatus {
  isConnected: boolean;
  workspaceName?: string;
  workspaceId?: string;
  webhookConfigured: boolean;
  projectMappings: ProjectMapping[];
}

export interface GitInfo {
  isRepo: boolean;
  remoteUrl?: string;
  branch?: string;
  lastCommitHash?: string;
  lastCommitMessage?: string;
  lastCommitAuthor?: string;
  lastCommitDate?: string;
}

export interface IntegrationStatus {
  clickUp: ClickUpStatus;
}

@Injectable({ providedIn: 'root' })
export class IntegrationService {
  private base = `${environment.apiUrl}/integrations`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<IntegrationStatus> {
    return this.http.get<IntegrationStatus>(`${this.base}/status`);
  }

  updateMapping(projectId: number, clickUpListId: string | null): Observable<void> {
    return this.http.put<void>(`${this.base}/mapping/${projectId}`, { clickUpListId });
  }

  syncOne(projectId: number): Observable<any> {
    return this.http.post<any>(`${this.base}/sync/${projectId}`, {});
  }

  syncAll(): Observable<any[]> {
    return this.http.post<any[]>(`${this.base}/sync-all`, {});
  }

  getGitInfo(): Observable<GitInfo> {
    return this.http.get<GitInfo>(`${this.base}/git`);
  }
}
