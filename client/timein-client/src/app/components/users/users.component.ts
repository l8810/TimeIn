import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/models';
import { environment } from '../../../environments/environment';
import { UserFormComponent } from './user-form.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatChipsModule, MatSnackBarModule, MatTooltipModule, MatDialogModule],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1>עובדים</h1>
          <p class="header-sub">ניהול חברי הצוות</p>
        </div>
        <div class="header-actions">
          <button class="btn-toggle" [class.active]="showInactive" (click)="toggleInactive()">
            <mat-icon>{{ showInactive ? 'visibility' : 'visibility_off' }}</mat-icon>
            {{ showInactive ? 'הסתר לא פעילים' : 'הצג לא פעילים' }}
          </button>
          <button class="btn-primary" (click)="openForm()">
            <mat-icon>person_add</mat-icon> הוסף עובד
          </button>
        </div>
      </div>

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon total"><mat-icon>group</mat-icon></div>
          <div>
            <div class="stat-value">{{ total }}</div>
            <div class="stat-label">סה"כ</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon active"><mat-icon>check_circle</mat-icon></div>
          <div>
            <div class="stat-value">{{ active }}</div>
            <div class="stat-label">פעילים</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon manager"><mat-icon>manage_accounts</mat-icon></div>
          <div>
            <div class="stat-value">{{ managers }}</div>
            <div class="stat-label">מנהלים</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon employee"><mat-icon>person</mat-icon></div>
          <div>
            <div class="stat-value">{{ employees }}</div>
            <div class="stat-label">עובדים</div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-card">
        <table mat-table [dataSource]="dataSource" class="main-table">

          <ng-container matColumnDef="avatar">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let u">
              <div class="avatar" [class]="'avatar-' + u.role.toLowerCase()">
                {{ initials(u.fullName) }}
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>שם</th>
            <td mat-cell *matCellDef="let u">
              <div class="user-name">{{ u.fullName }}</div>
              <div class="user-email">{{ u.email }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>תפקיד</th>
            <td mat-cell *matCellDef="let u">
              <span class="badge" [class]="'role-' + u.role.toLowerCase()">
                <mat-icon class="badge-icon">{{ roleIcon(u.role) }}</mat-icon>
                {{ roleLabel(u.role) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="team">
            <th mat-header-cell *matHeaderCellDef>צוות</th>
            <td mat-cell *matCellDef="let u">
              @if (u.teamName) {
                <div class="team-chip">
                  <mat-icon class="team-chip-icon">corporate_fare</mat-icon>
                  {{ u.teamName }}
                </div>
              } @else {
                <span class="no-team">—</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>סטטוס</th>
            <td mat-cell *matCellDef="let u">
              <div class="status-dot-row">
                <span class="status-dot" [class]="u.isActive ? 'dot-active' : 'dot-inactive'"></span>
                <span class="status-text" [class]="u.isActive ? 'text-active' : 'text-inactive'">
                  {{ u.isActive ? 'פעיל' : 'לא פעיל' }}
                </span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let u">
              <div class="action-btns">
                @if (canEdit(u)) {
                  <button class="edit-btn" matTooltip="עריכה" (click)="openForm(u)">
                    <mat-icon>edit</mat-icon>
                  </button>
                }
                @if (canManage(u)) {
                  @if (u.isActive) {
                    <button class="deactivate-btn" matTooltip="השבתת עובד" (click)="deactivate(u)">
                      <mat-icon>person_off</mat-icon>
                    </button>
                  } @else {
                    <button class="activate-btn" matTooltip="הפעלת עובד" (click)="activate(u)">
                      <mat-icon>person_add</mat-icon>
                    </button>
                  }
                }
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
        </table>

        @if (!dataSource.data.length) {
          <div class="empty-state">
            <div class="empty-icon"><mat-icon>group_off</mat-icon></div>
            <p class="empty-title">אין עובדים להצגה</p>
            <p class="empty-sub">לחץ על "הוסף עובד" כדי להתחיל</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }

    /* Header */
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { margin: 0 0 2px; font-size: 28px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.5px; }
    .header-sub { margin: 0; color: #9ca3af; font-size: 13px; }
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .btn-toggle {
      height: 44px; padding: 0 18px; border: 1.5px solid #e5e7eb; border-radius: 12px;
      background: white; color: #6b7280; font-size: 13px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer;
      display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-toggle mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-toggle:hover { border-color: #818cf8; color: #4f46e5; }
    .btn-toggle.active { border-color: #4f46e5; background: #ede9fe; color: #4f46e5; }
    .btn-primary { height: 44px; padding: 0 22px; border: none; border-radius: 12px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; font-size: 14px; font-weight: 600; font-family: inherit;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      transition: all 0.2s; box-shadow: 0 2px 8px rgba(79,70,229,.3); }
    .btn-primary:hover { box-shadow: 0 6px 20px rgba(79,70,229,.45); transform: translateY(-1px); }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Stats */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
    .stat-card { background: white; border-radius: 14px; padding: 16px 20px;
                 display: flex; align-items: center; gap: 14px;
                 box-shadow: 0 1px 8px rgba(30,27,75,.06); }
    .stat-icon { width: 42px; height: 42px; border-radius: 12px;
                 display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .stat-icon.total    { background: #ede9fe; color: #7c3aed; }
    .stat-icon.active   { background: #d1fae5; color: #059669; }
    .stat-icon.manager  { background: #dbeafe; color: #1d4ed8; }
    .stat-icon.employee { background: #fef3c7; color: #b45309; }
    .stat-value { font-size: 22px; font-weight: 800; color: #1e1b4b; line-height: 1; }
    .stat-label { font-size: 12px; color: #9ca3af; margin-top: 2px; }

    /* Table */
    .table-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(30,27,75,.07); overflow: hidden; }
    .main-table { width: 100%; }
    .mat-mdc-header-row { background: #f9f8ff; }
    th.mat-mdc-header-cell { font-weight: 700; font-size: 12px; color: #9ca3af; letter-spacing: 0.05em;
      text-transform: uppercase; border-bottom: 1px solid #f3f4f6; padding: 14px 16px; }
    td.mat-mdc-cell { padding: 13px 16px; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
    .table-row { transition: background 0.1s; }
    .table-row:hover td { background: #fafafe; }
    .table-row:last-child td { border-bottom: none; }

    /* Avatar */
    .avatar { width: 38px; height: 38px; border-radius: 50%;
              color: white; font-weight: 700; font-size: 13px;
              display: flex; align-items: center; justify-content: center; }
    .avatar-employee { background: linear-gradient(135deg, #4f46e5, #7c3aed); }
    .avatar-manager  { background: linear-gradient(135deg, #0ea5e9, #1d4ed8); }
    .avatar-admin    { background: linear-gradient(135deg, #f59e0b, #ef4444); }

    /* Name */
    .user-name  { font-weight: 600; color: #1e1b4b; font-size: 14px; }
    .user-email { color: #9ca3af; font-size: 12px; margin-top: 1px; }

    /* Badges */
    .badge { font-size: 12px; font-weight: 600; padding: 4px 10px 4px 8px; border-radius: 20px;
             display: inline-flex; align-items: center; gap: 4px; }
    .badge-icon { font-size: 13px; width: 13px; height: 13px; }
    .role-employee { background: #ede9fe; color: #5b21b6; }
    .role-manager  { background: #dbeafe; color: #1e40af; }
    .role-admin    { background: #fef3c7; color: #92400e; }

    /* Team chip */
    .team-chip { display: inline-flex; align-items: center; gap: 5px;
                 background: #f3f4f6; color: #4b5563; font-size: 13px;
                 padding: 4px 10px; border-radius: 8px; font-weight: 500; }
    .team-chip-icon { font-size: 14px; width: 14px; height: 14px; color: #818cf8; }
    .no-team { color: #d1d5db; font-size: 13px; }

    /* Status */
    .status-dot-row { display: flex; align-items: center; gap: 7px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot-active   { background: #10b981; box-shadow: 0 0 0 2px rgba(16,185,129,.2); }
    .dot-inactive { background: #d1d5db; }
    .status-text  { font-size: 13px; font-weight: 500; }
    .text-active   { color: #059669; }
    .text-inactive { color: #9ca3af; }

    /* Action buttons */
    .action-btns { display: flex; align-items: center; gap: 6px; }
    .edit-btn { width: 32px; height: 32px; border: none; border-radius: 8px;
      background: #eff6ff; color: #3b82f6; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .edit-btn:hover { background: #dbeafe; transform: scale(1.1); }
    .edit-btn mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .activate-btn { width: 32px; height: 32px; border: none; border-radius: 8px;
      background: #d1fae5; color: #059669; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .activate-btn:hover { background: #a7f3d0; transform: scale(1.1); }
    .activate-btn mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .deactivate-btn { width: 32px; height: 32px; border: none; border-radius: 8px;
      background: #fff1f2; color: #f43f5e; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .deactivate-btn:hover { background: #ffe4e6; transform: scale(1.1); }
    .deactivate-btn mat-icon { font-size: 17px; width: 17px; height: 17px; }

    /* Empty state */
    .empty-state { text-align: center; padding: 72px 24px; }
    .empty-icon { width: 64px; height: 64px; border-radius: 20px; background: #f3f4f6;
                  display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    .empty-icon mat-icon { font-size: 32px; width: 32px; height: 32px; color: #9ca3af; }
    .empty-title { margin: 0 0 6px; font-size: 16px; font-weight: 600; color: #374151; }
    .empty-sub   { margin: 0; font-size: 13px; color: #9ca3af; }
  `]
})
export class UsersComponent implements OnInit {
  dataSource = new MatTableDataSource<User>([]);
  displayedColumns = ['avatar', 'name', 'role', 'team', 'status', 'actions'];
  showInactive = false;
  private allUsers: User[] = [];

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit() { this.load(); }

  openForm(user?: User) {
    const currentUser = this.auth.currentUser();
    const ref = this.dialog.open(UserFormComponent, {
      width: '460px',
      data: {
        isAdmin: this.auth.hasRole('Admin'),
        managerTeamName: currentUser?.teamName,
        user
      }
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  private load() {
    this.http.get<User[]>(`${environment.apiUrl}/users`).subscribe({
      next: u => {
        this.allUsers = u;
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: () => this.snackBar.open('שגיאה בטעינת העובדים', 'סגור', { duration: 3000 })
    });
  }

  toggleInactive() {
    this.showInactive = !this.showInactive;
    this.applyFilter();
  }

  private applyFilter() {
    this.dataSource.data = this.showInactive
      ? this.allUsers
      : this.allUsers.filter(u => u.isActive);
    this.cdr.detectChanges();
  }

  get total()     { return this.allUsers.length; }
  get active()    { return this.allUsers.filter(u => u.isActive).length; }
  get managers()  { return this.allUsers.filter(u => u.role === 'Manager' && u.isActive).length; }
  get employees() { return this.allUsers.filter(u => u.role === 'Employee' && u.isActive).length; }

  roleIcon(role: string): string {
    const m: any = { Employee: 'person', Manager: 'manage_accounts', Admin: 'shield' };
    return m[role] ?? 'person';
  }

  canEdit(user: User): boolean {
    if (this.auth.hasRole('Admin')) return true;
    if (this.auth.hasRole('Manager')) return user.role === 'Employee';
    return false;
  }

  canManage(user: User): boolean {
    if (this.auth.hasRole('Admin')) return true;
    if (this.auth.hasRole('Manager')) return user.role === 'Employee';
    return false;
  }

  deactivate(user: User) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'השבתת עובד', message: `להשבית את ${user.fullName}?` }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.http.delete(`${environment.apiUrl}/users/${user.userId}`).subscribe({
        next: () => { this.snackBar.open('העובד הושבת', 'סגור', { duration: 2000 }); this.load(); },
        error: () => this.snackBar.open('שגיאה', 'סגור', { duration: 3000 })
      });
    });
  }

  activate(user: User) {
    this.http.put(`${environment.apiUrl}/users/${user.userId}`, { isActive: true }).subscribe({
      next: () => { this.snackBar.open('העובד הופעל מחדש', 'סגור', { duration: 2000 }); this.load(); },
      error: () => this.snackBar.open('שגיאה', 'סגור', { duration: 3000 })
    });
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  roleLabel(role: string): string {
    const m: any = { Employee: 'עובד', Manager: 'מנהל', Admin: 'אדמין' };
    return m[role] ?? role;
  }
}
