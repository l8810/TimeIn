import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private base = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getAll(projectId?: number, userId?: number): Observable<Task[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('projectId', projectId);
    if (userId) params = params.set('userId', userId);
    return this.http.get<Task[]>(this.base, { params });
  }

  getById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.base}/${id}`);
  }

  create(data: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(this.base, data);
  }

  update(id: number, data: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.base}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  takeTask(id: number): Observable<Task> {
    return this.http.post<Task>(`${this.base}/${id}/take`, {});
  }
}
