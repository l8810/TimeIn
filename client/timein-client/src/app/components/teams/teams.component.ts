import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';
import { Team, User } from '../../models/models';
import { environment } from '../../../environments/environment';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <div class="form-header">
      <h2>הוספת צוות חדש</h2>
    </div>

    <mat-dialog-content>
      @if (error) {
        <div class="error-box">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error }}</span>
        </div>
      }

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>שם הצוות *</mat-label>
        <input matInput [(ngModel)]="teamName" required />
      </mat-form-field>

      <!-- Leader section -->
      <div class="section-title">
        <mat-icon>person_pin</mat-icon>
        <span>ראש צוות *</span>
      </div>

      <div class="leader-toggle">
        <button class="toggle-btn" [class.active]="leaderMode === 'existing'" (click)="leaderMode = 'existing'">
          <mat-icon>person_search</mat-icon> עובד קיים
        </button>
        <button class="toggle-btn" [class.active]="leaderMode === 'new'" (click)="leaderMode = 'new'">
          <mat-icon>person_add</mat-icon> עובד חדש
        </button>
      </div>

      @if (leaderMode === 'existing') {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>בחר עובד מהרשימה</mat-label>
          <mat-select [(ngModel)]="leaderId">
            @for (u of users; track u.userId) {
              <mat-option [value]="u.userId">{{ u.fullName }} — {{ u.email }}</mat-option>
            }
          </mat-select>
          @if (!users.length) {
            <mat-hint>אין עובדים זמינים — צור עובד חדש</mat-hint>
          }
        </mat-form-field>
      } @else {
        <div class="new-leader-fields">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>שם מלא *</mat-label>
            <input matInput [(ngModel)]="newLeader.fullName" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>אימייל *</mat-label>
            <input matInput type="email" [(ngModel)]="newLeader.email" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>סיסמה *</mat-label>
            <input matInput type="password" [(ngModel)]="newLeader.password" />
            <mat-hint>לפחות 6 תווים</mat-hint>
          </mat-form-field>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>ביטול</button>
      <button mat-raised-button color="primary" [disabled]="!canSave" (click)="submit()">
        <mat-icon>group_add</mat-icon> צור צוות
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-header { padding: 20px 24px 0; }
    h2 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #1e1b4b; }
    mat-dialog-content { min-width: 440px; padding-top: 12px; }
    .full-width { width: 100%; }

    .error-box {
      display: flex; align-items: center; gap: 10px;
      background: #fef2f2; color: #991b1b;
      border: 1px solid #fca5a5; border-radius: 10px;
      padding: 10px 14px; margin-bottom: 14px; font-size: 13px; font-weight: 600;
    }
    .error-box mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 700; color: #374151;
      margin: 4px 0 12px;
    }
    .section-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: #4f46e5; }

    .leader-toggle {
      display: flex; gap: 8px; margin-bottom: 14px;
    }
    .toggle-btn {
      flex: 1; height: 40px; border: 1.5px solid #e5e7eb; border-radius: 10px;
      background: white; color: #6b7280; font-size: 13px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: all 0.15s;
    }
    .toggle-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .toggle-btn:hover { border-color: #4f46e5; color: #4f46e5; }
    .toggle-btn.active {
      border-color: #4f46e5; background: #eef2ff;
      color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
    }

    .new-leader-fields { display: flex; flex-direction: column; }
  `]
})
export class TeamFormComponent {
  teamName = '';
  leaderMode: 'existing' | 'new' = 'existing';
  leaderId: number | null = null;
  newLeader = { fullName: '', email: '', password: '' };
  error = '';

  constructor(
    public dialogRef: MatDialogRef<TeamFormComponent>,
    @Inject(MAT_DIALOG_DATA) public users: User[]
  ) {}

  get canSave(): boolean {
    if (!this.teamName.trim()) return false;
    if (this.leaderMode === 'existing') return !!this.leaderId;
    return !!(this.newLeader.fullName.trim() && this.newLeader.email.trim() && this.newLeader.password.length >= 6);
  }

  submit() {
    const result: any = { teamName: this.teamName.trim() };
    if (this.leaderMode === 'existing') {
      result.leaderId = this.leaderId;
    } else {
      result.newLeader = { ...this.newLeader };
    }
    this.dialogRef.close(result);
  }
}

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule,
    MatTableModule, MatSnackBarModule, MatDialogModule, MatTooltipModule, MatSelectModule],
  animations: [
    trigger('membersExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', overflow: 'hidden', opacity: 0 })),
      state('expanded',  style({ height: '*', opacity: 1 })),
      transition('expanded <=> collapsed', animate('220ms cubic-bezier(.4,0,.2,1)'))
    ])
  ],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>צוותים</h1>
          <p class="header-sub">{{ teams.length }} צוותים · {{ totalMembers }} עובדים</p>
        </div>
        @if (auth.hasRole('Admin')) {
          <button class="btn-primary" (click)="openForm()">
            <mat-icon>group_add</mat-icon> הוסף צוות
          </button>
        }
      </div>

      <!-- Cards grid -->
      @if (teams.length) {
        <div class="cards-grid">
          @for (t of teams; track t.teamId; let i = $index) {
            <div class="team-card" [class.is-expanded]="expandedTeam === t">

              <!-- Card header -->
              <div class="card-header" [style.background]="gradient(i)">
                <div class="card-header-icon">
                  <mat-icon>groups</mat-icon>
                </div>
                <div class="card-header-info">
                  <div class="card-team-name">{{ t.teamName }}</div>
                  <div class="card-member-count">{{ t.memberCount }} עובדים</div>
                </div>
                <div class="card-header-actions">
                  @if ((t.memberCount ?? 0) > 0) {
                    <button class="icon-btn light" (click)="toggle(t)"
                            [matTooltip]="expandedTeam === t ? 'סגור' : 'הצג עובדים'">
                      <mat-icon>{{ expandedTeam === t ? 'expand_less' : 'people' }}</mat-icon>
                    </button>
                  }
                  @if (auth.hasRole('Admin')) {
                    <button class="icon-btn danger" (click)="delete(t)" matTooltip="מחק צוות">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  }
                </div>
              </div>

              <!-- Member avatars preview -->
              @if ((t.memberCount ?? 0) > 0 && expandedTeam !== t) {
                <div class="avatars-preview">
                  @for (u of membersOf(t).slice(0, 5); track u.userId) {
                    <div class="preview-avatar" [matTooltip]="u.fullName">
                      {{ initials(u.fullName) }}
                    </div>
                  }
                  @if ((t.memberCount ?? 0) > 5) {
                    <div class="preview-avatar more">+{{ (t.memberCount ?? 0) - 5 }}</div>
                  }
                </div>
              }

              <!-- Expanded member list -->
              <div [@membersExpand]="expandedTeam === t ? 'expanded' : 'collapsed'">
                <div class="member-list">
                  @for (u of membersOf(t); track u.userId) {
                    <div class="member-row">
                      <div class="member-avatar" [class]="'av-' + u.role.toLowerCase()">
                        {{ initials(u.fullName) }}
                      </div>
                      <div class="member-info">
                        <div class="member-name">{{ u.fullName }}</div>
                        <div class="member-email">{{ u.email }}</div>
                      </div>
                      <span class="role-badge" [class]="'role-' + u.role.toLowerCase()">
                        {{ roleLabel(u.role) }}
                      </span>
                    </div>
                  }
                </div>
              </div>

              <!-- Empty team note -->
              @if ((t.memberCount ?? 0) === 0) {
                <div class="empty-card">
                  <mat-icon>person_off</mat-icon>
                  <span>אין עובדים בצוות</span>
                </div>
              }

            </div>
          }
        </div>
      } @else {
        <div class="empty-state">
          <div class="empty-icon"><mat-icon>groups</mat-icon></div>
          <p class="empty-title">אין צוותים עדיין</p>
          <p class="empty-sub">לחץ על "הוסף צוות" כדי להתחיל</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }

    /* Header */
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
    h1 { margin: 0 0 2px; font-size: 28px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.5px; }
    .header-sub { margin: 0; color: #9ca3af; font-size: 13px; }
    .btn-primary { height: 44px; padding: 0 22px; border: none; border-radius: 12px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white;
      font-size: 14px; font-weight: 600; font-family: inherit;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      transition: all 0.2s; box-shadow: 0 2px 8px rgba(79,70,229,.3); }
    .btn-primary:hover { box-shadow: 0 6px 20px rgba(79,70,229,.45); transform: translateY(-1px); }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Grid */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }

    /* Card */
    .team-card { background: white; border-radius: 18px;
                 box-shadow: 0 2px 12px rgba(30,27,75,.08);
                 overflow: hidden; transition: box-shadow 0.2s, transform 0.2s; }
    .team-card:hover { box-shadow: 0 8px 28px rgba(30,27,75,.13); transform: translateY(-2px); }
    .team-card.is-expanded { box-shadow: 0 8px 28px rgba(30,27,75,.13); }

    /* Card header */
    .card-header { padding: 20px; display: flex; align-items: center; gap: 14px; }
    .card-header-icon { width: 48px; height: 48px; border-radius: 14px;
                        background: rgba(255,255,255,.22);
                        display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .card-header-icon mat-icon { color: white; font-size: 26px; width: 26px; height: 26px; }
    .card-header-info { flex: 1; min-width: 0; }
    .card-team-name { font-size: 17px; font-weight: 700; color: white;
                      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-member-count { font-size: 13px; color: rgba(255,255,255,.75); margin-top: 2px; }
    .card-header-actions { display: flex; gap: 6px; flex-shrink: 0; }

    /* Icon buttons */
    .icon-btn { width: 34px; height: 34px; border: none; border-radius: 10px;
                cursor: pointer; display: flex; align-items: center; justify-content: center;
                transition: all 0.15s; }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .icon-btn.light { background: rgba(255,255,255,.2); color: white; }
    .icon-btn.light:hover { background: rgba(255,255,255,.35); }
    .icon-btn.danger { background: rgba(255,255,255,.15); color: rgba(255,220,220,.9); }
    .icon-btn.danger:hover { background: rgba(239,68,68,.3); color: white; }

    /* Avatar preview strip */
    .avatars-preview { display: flex; padding: 14px 20px; gap: 0; border-bottom: 1px solid #f3f4f6; }
    .preview-avatar { width: 32px; height: 32px; border-radius: 50%; border: 2px solid white;
                      margin-right: -8px; background: linear-gradient(135deg, #818cf8, #a78bfa);
                      color: white; font-size: 11px; font-weight: 700;
                      display: flex; align-items: center; justify-content: center;
                      cursor: default; transition: transform 0.15s; z-index: 1; }
    .preview-avatar:hover { transform: translateY(-3px); z-index: 10; }
    .preview-avatar.more { background: #e5e7eb; color: #6b7280; font-size: 10px; }

    /* Member list */
    .member-list { padding: 8px 0; }
    .member-row { display: flex; align-items: center; gap: 12px;
                  padding: 10px 20px; transition: background 0.1s; }
    .member-row:hover { background: #fafafe; }
    .member-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
                     color: white; font-weight: 700; font-size: 12px;
                     display: flex; align-items: center; justify-content: center; }
    .av-employee { background: linear-gradient(135deg, #4f46e5, #7c3aed); }
    .av-manager  { background: linear-gradient(135deg, #0ea5e9, #1d4ed8); }
    .av-admin    { background: linear-gradient(135deg, #f59e0b, #ef4444); }
    .member-info { flex: 1; min-width: 0; }
    .member-name  { font-weight: 600; color: #1e1b4b; font-size: 13px; }
    .member-email { color: #9ca3af; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .role-badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; flex-shrink: 0; }
    .role-employee { background: #ede9fe; color: #5b21b6; }
    .role-manager  { background: #dbeafe; color: #1e40af; }
    .role-admin    { background: #fef3c7; color: #92400e; }

    /* Empty card */
    .empty-card { display: flex; align-items: center; gap: 8px; padding: 16px 20px;
                  color: #d1d5db; font-size: 13px; }
    .empty-card mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Empty state */
    .empty-state { text-align: center; padding: 80px 24px; }
    .empty-icon { width: 72px; height: 72px; border-radius: 22px; background: #f3f4f6;
                  display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .empty-icon mat-icon { font-size: 36px; width: 36px; height: 36px; color: #9ca3af; }
    .empty-title { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #374151; }
    .empty-sub   { margin: 0; font-size: 14px; color: #9ca3af; }
  `]
})
export class TeamsComponent implements OnInit {
  teams: Team[] = [];
  expandedTeam: Team | null = null;
  allUsers: User[] = [];

  private readonly gradients = [
    'linear-gradient(135deg, #4f46e5, #7c3aed)',
    'linear-gradient(135deg, #0ea5e9, #2563eb)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ef4444, #dc2626)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #06b6d4, #0284c7)',
    'linear-gradient(135deg, #f97316, #ea580c)',
  ];

  constructor(
    private teamService: TeamService,
    public auth: AuthService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.load(); }

  get totalMembers() { return this.teams.reduce((s, t) => s + (t.memberCount ?? 0), 0); }

  gradient(i: number) { return this.gradients[i % this.gradients.length]; }

  toggle(team: Team) { this.expandedTeam = this.expandedTeam === team ? null : team; }

  membersOf(team: Team): User[] { return this.allUsers.filter(u => u.teamId === team.teamId); }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  roleLabel(role: string): string {
    const m: any = { Employee: 'עובד', Manager: 'מנהל', Admin: 'אדמין' };
    return m[role] ?? role;
  }

  openForm() {
    const ref = this.dialog.open(TeamFormComponent, {
      width: '500px',
      data: this.allUsers
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.teamService.create(result).subscribe({
        next: () => { this.load(); this.snackBar.open('הצוות נוסף בהצלחה', 'סגור', { duration: 2000 }); },
        error: (err) => {
          const msg = err.error?.message ?? 'שגיאה ביצירת הצוות';
          this.snackBar.open(msg, 'סגור', { duration: 4000 });
        }
      });
    });
  }

  delete(team: Team) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'מחיקת צוות', message: `למחוק את הצוות "${team.teamName}"?` }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.teamService.delete(team.teamId).subscribe({
        next: () => { this.load(); this.snackBar.open('הצוות נמחק', 'סגור', { duration: 2000 }); },
        error: () => this.snackBar.open('שגיאה במחיקת הצוות', 'סגור', { duration: 3000 })
      });
    });
  }

  private load() {
    this.teamService.getAll().subscribe({
      next: teams => { this.teams = teams; this.cdr.detectChanges(); },
      error: () => this.snackBar.open('שגיאה בטעינת הצוותים', 'סגור', { duration: 3000 })
    });
    this.http.get<User[]>(`${environment.apiUrl}/users`).subscribe({
      next: users => { this.allUsers = users; this.cdr.detectChanges(); }
    });
  }
}
