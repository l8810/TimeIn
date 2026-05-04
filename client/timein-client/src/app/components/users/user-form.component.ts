import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TeamService } from '../../services/team.service';
import { Team, User } from '../../models/models';
import { environment } from '../../../environments/environment';

interface FormData {
  isAdmin: boolean;
  managerTeamName?: string;
  user?: User;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatSnackBarModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'עריכת עובד' : 'הוספת עובד' }}</h2>

    <mat-dialog-content>
      @if (emailError) {
        <div class="email-error">
          <mat-icon>person_off</mat-icon>
          <div>
            <strong>אימייל כבר קיים</strong>
            <span>{{ emailError }}</span>
          </div>
        </div>
      }

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>שם מלא *</mat-label>
        <input matInput [(ngModel)]="model.fullName" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>אימייל *</mat-label>
        <input matInput type="email" [(ngModel)]="model.email" [readonly]="isEdit" required />
        @if (isEdit) {
          <mat-hint>לא ניתן לשנות אימייל</mat-hint>
        }
      </mat-form-field>

      @if (!isEdit) {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>סיסמה *</mat-label>
          <input matInput type="password" [(ngModel)]="model.password" required />
        </mat-form-field>
      }

      @if (data.isAdmin) {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>תפקיד</mat-label>
          <mat-select [(ngModel)]="model.role">
            <mat-option value="Employee">עובד</mat-option>
            <mat-option value="Manager">מנהל</mat-option>
            <mat-option value="Admin">אדמין</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>צוות{{ !isEdit ? ' *' : '' }}</mat-label>
          <mat-select [(ngModel)]="model.teamId">
            @if (isEdit) { <mat-option [value]="null">ללא צוות</mat-option> }
            @for (t of teams; track t.teamId) {
              <mat-option [value]="t.teamId">{{ t.teamName }}</mat-option>
            }
          </mat-select>
          @if (!isEdit && !model.teamId) {
            <mat-hint class="team-hint">יש לבחור צוות</mat-hint>
          }
        </mat-form-field>

        @if (isEdit) {
          <div class="status-toggle">
            <span class="status-label">סטטוס</span>
            <button class="status-btn" [class.active]="model.isActive" (click)="model.isActive = true">פעיל</button>
            <button class="status-btn" [class.inactive]="!model.isActive" (click)="model.isActive = false">לא פעיל</button>
          </div>
        }
      } @else {
        <div class="team-note">
          <span>הצוות: </span><strong>{{ data.managerTeamName || '—' }}</strong>
          <span class="note-sub">(העובד ישויך לצוות שלך)</span>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>ביטול</button>
      <button mat-raised-button color="primary"
        [disabled]="saving || !model.fullName || !model.email || (!isEdit && !model.password) || (!isEdit && data.isAdmin && !model.teamId)"
        (click)="save()">
        {{ saving ? 'שומר...' : (isEdit ? 'שמור שינויים' : 'הוסף עובד') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 400px; padding-top: 8px; }
    .full-width { width: 100%; }
    .team-note { font-size: 14px; color: #374151; padding: 8px 0 16px;
                 display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .note-sub { color: #9ca3af; font-size: 12px; }
    .team-hint { color: #dc2626 !important; }
    .email-error {
      display: flex; align-items: flex-start; gap: 12px;
      background: #fef2f2; color: #991b1b;
      border: 1.5px solid #f87171; border-radius: 10px;
      padding: 12px 14px; margin-bottom: 16px;
    }
    .email-error mat-icon { font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; margin-top: 1px; }
    .email-error div { display: flex; flex-direction: column; gap: 2px; }
    .email-error strong { font-size: 14px; }
    .email-error span { font-size: 12px; color: #b91c1c; }
    .status-toggle {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 0 16px;
    }
    .status-label { font-size: 14px; color: #6b7280; margin-left: 8px; }
    .status-btn {
      height: 32px; padding: 0 16px; border: 1.5px solid #e5e7eb;
      border-radius: 8px; background: white; font-size: 13px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
      color: #9ca3af;
    }
    .status-btn.active   { border-color: #10b981; background: #d1fae5; color: #065f46; }
    .status-btn.inactive { border-color: #f87171; background: #fee2e2; color: #991b1b; }
  `]
})
export class UserFormComponent implements OnInit {
  model: any = { role: 'Employee', fullName: '', email: '', password: '', teamId: null, isActive: true };
  saving = false;
  emailError = '';
  teams: Team[] = [];
  isEdit = false;

  constructor(
    public dialogRef: MatDialogRef<UserFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FormData,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private teamService: TeamService
  ) {}

  ngOnInit() {
    if (this.data.isAdmin) {
      this.teamService.getAll().subscribe(t => this.teams = t);
    }
    if (this.data.user) {
      this.isEdit = true;
      const u = this.data.user;
      this.model = { fullName: u.fullName, email: u.email, role: u.role, teamId: u.teamId ?? null, isActive: u.isActive };
    }
  }

  save() {
    this.saving = true;
    this.emailError = '';

    if (this.isEdit) {
      const payload: any = { fullName: this.model.fullName };
      if (this.data.isAdmin) {
        payload.role = this.model.role;
        payload.teamId = this.model.teamId ?? 0;
        payload.isActive = this.model.isActive;
      }
      this.http.put(`${environment.apiUrl}/users/${this.data.user!.userId}`, payload).subscribe({
        next: () => {
          this.dialogRef.close(true);
          this.snackBar.open('הפרטים עודכנו בהצלחה', 'סגור', { duration: 2000 });
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.snackBar.open(`שגיאה ${err.status}`, 'סגור', { duration: 4000 });
        }
      });
    } else {
      if (!this.model.fullName || !this.model.email || !this.model.password) { this.saving = false; return; }
      this.http.post(`${environment.apiUrl}/users`, this.model).subscribe({
        next: () => {
          this.dialogRef.close(true);
          this.snackBar.open('העובד נוסף בהצלחה', 'סגור', { duration: 2000 });
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          if (err.status === 409) {
            this.emailError = err.error?.message ?? 'האימייל כבר קיים במערכת.';
          } else if (err.status === 400) {
            this.snackBar.open('נתונים שגויים (אימייל לא תקין / סיסמה קצרה מ-6 תווים)', 'סגור', { duration: 5000 });
          } else {
            this.snackBar.open(`שגיאה ${err.status}`, 'סגור', { duration: 4000 });
          }
        }
      });
    }
  }
}
