import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project, ProjectMember, Task, ClickUpTaskSummary } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private base = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Project[]> {
    return this.http.get<Project[]>(this.base);
  }

  getById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.base}/${id}`);
  }

  create(data: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.base, data);
  }

  update(id: number, data: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.base}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getMembers(projectId: number): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(`${this.base}/${projectId}/members`);
  }

  addMember(projectId: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${projectId}/members`, { userId });
  }

  removeMember(projectId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${projectId}/members/${userId}`);
  }

  getProjectTasks(projectId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.base}/${projectId}/tasks`);
  }

  syncClickUp(projectId: number): Observable<{ created: number; updated: number; errors: string[] }> {
    return this.http.post<any>(`${environment.apiUrl}/clickup/sync/${projectId}`, {});
  }

  getClickUpTasks(projectId: number): Observable<ClickUpTaskSummary[]> {
    return this.http.get<ClickUpTaskSummary[]>(`${environment.apiUrl}/clickup/tasks/${projectId}`);
  }
}
