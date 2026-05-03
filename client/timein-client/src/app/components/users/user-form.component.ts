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
import { Team } from '../../models/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatSnackBarModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>הוספת עובד</h2>

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
        <input matInput type="email" [(ngModel)]="model.email" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>סיסמה *</mat-label>
        <input matInput type="password" [(ngModel)]="model.password" required />
      </mat-form-field>

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
          <mat-label>צוות *</mat-label>
          <mat-select [(ngModel)]="model.teamId" required>
            @for (t of teams; track t.teamId) {
              <mat-option [value]="t.teamId">{{ t.teamName }}</mat-option>
            }
          </mat-select>
          @if (!model.teamId) {
            <mat-hint class="team-hint">יש לבחור צוות</mat-hint>
          }
        </mat-form-field>
      } @else {
        <div class="team-note">
          <span>הצוות: </span><strong>{{ data.managerTeamName || '—' }}</strong>
          <span class="note-sub">(העובד יצורף לצוות שלך)</span>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>ביטול</button>
      <button mat-raised-button color="primary"
        [disabled]="saving || !model.fullName || !model.email || !model.password || (data.isAdmin && !model.teamId)"
        (click)="save()">
        {{ saving ? 'שומר...' : 'הוסף עובד' }}
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
  `]
})
export class UserFormComponent implements OnInit {
  model: any = { role: 'Employee', fullName: '', email: '', password: '', teamId: null };
  saving = false;
  emailError = '';
  teams: Team[] = [];

  constructor(
    public dialogRef: MatDialogRef<UserFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isAdmin: boolean; managerTeamName?: string },
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private teamService: TeamService
  ) {}

  ngOnInit() {
    if (this.data.isAdmin) {
      this.teamService.getAll().subscribe(t => this.teams = t);
    }
  }

  save() {
    if (!this.model.fullName || !this.model.email || !this.model.password) return;
    this.saving = true;
    this.emailError = '';
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
