import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { IntegrationService, IntegrationStatus, ProjectMapping, GitInfo } from '../../services/integration.service';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, MatSnackBarModule],
  template: `
    <div class="page">

      <div class="page-header">
        <div>
          <h1>אינטגרציות</h1>
          <p class="header-sub">ניהול חיבורים לכלים חיצוניים</p>
        </div>
        <button class="btn-sync-all" [class.loading]="syncingAll" (click)="syncAll()" [disabled]="syncingAll || !hasMappedProjects">
          <mat-icon>sync</mat-icon>
          {{ syncingAll ? 'מסנכרן...' : 'סנכרן הכל' }}
        </button>
      </div>

      @if (loading) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>טוען סטטוס...</span>
        </div>
      } @else if (status) {

        <!-- Git Card -->
        <div class="git-card">
          <div class="git-card-header">
            <div class="git-icon-wrap">
              <mat-icon>code</mat-icon>
            </div>
            <div>
              <div class="git-title">Git Repository</div>
              @if (git?.remoteUrl) {
                <div class="git-remote">{{ git?.remoteUrl }}</div>
              }
            </div>
            <div class="git-badge" [class.git-badge-ok]="git?.isRepo" [class.git-badge-no]="!git?.isRepo">
              {{ git?.isRepo ? 'מחובר' : 'לא זוהה' }}
            </div>
          </div>
          @if (git?.isRepo) {
            <div class="git-details">
              <div class="git-detail">
                <mat-icon>call_split</mat-icon>
                <span class="git-detail-label">Branch</span>
                <span class="git-branch">{{ git?.branch }}</span>
              </div>
              <div class="git-detail">
                <mat-icon>commit</mat-icon>
                <span class="git-detail-label">Commit אחרון</span>
                <span class="git-hash">{{ git?.lastCommitHash }}</span>
                <span class="git-msg">{{ git?.lastCommitMessage }}</span>
              </div>
              <div class="git-detail">
                <mat-icon>person</mat-icon>
                <span class="git-detail-label">מחבר</span>
                <span>{{ git?.lastCommitAuthor }}</span>
              </div>
              <div class="git-detail">
                <mat-icon>schedule</mat-icon>
                <span class="git-detail-label">תאריך</span>
                <span>{{ git?.lastCommitDate | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>
          }
        </div>

        <!-- Status Cards Row -->
        <div class="cards-row">

          <!-- ClickUp Connection Card -->
          <div class="status-card" [class.connected]="status.clickUp.isConnected" [class.disconnected]="!status.clickUp.isConnected">
            <div class="card-icon-wrap" [class.icon-green]="status.clickUp.isConnected" [class.icon-red]="!status.clickUp.isConnected">
              <mat-icon>task_alt</mat-icon>
            </div>
            <div class="card-body">
              <div class="card-title">ClickUp</div>
              <div class="card-meta">
                @if (status.clickUp.isConnected) {
                  <span class="status-dot green"></span>
                  <span>{{ status.clickUp.workspaceName ?? 'מחובר' }}</span>
                } @else {
                  <span class="status-dot red"></span>
                  <span>לא מחובר — בדוק את ה-API Key</span>
                }
              </div>
            </div>
            <div class="card-badge" [class.badge-green]="status.clickUp.isConnected" [class.badge-red]="!status.clickUp.isConnected">
              {{ status.clickUp.isConnected ? 'פעיל' : 'כבוי' }}
            </div>
          </div>

          <!-- Webhook Card -->
          <div class="status-card" [class.connected]="status.clickUp.webhookConfigured" [class.disconnected]="!status.clickUp.webhookConfigured">
            <div class="card-icon-wrap" [class.icon-green]="status.clickUp.webhookConfigured" [class.icon-orange]="!status.clickUp.webhookConfigured">
              <mat-icon>webhook</mat-icon>
            </div>
            <div class="card-body">
              <div class="card-title">Webhook</div>
              <div class="card-meta">
                @if (status.clickUp.webhookConfigured) {
                  <span class="status-dot green"></span>
                  <span>עדכונים מ-ClickUp בזמן אמת</span>
                } @else {
                  <span class="status-dot orange"></span>
                  <span>לא מוגדר — רשום Webhook אחרי העלאה לענן</span>
                }
              </div>
            </div>
            <div class="card-badge" [class.badge-green]="status.clickUp.webhookConfigured" [class.badge-orange]="!status.clickUp.webhookConfigured">
              {{ status.clickUp.webhookConfigured ? 'פעיל' : 'לא מוגדר' }}
            </div>
          </div>

        </div>

        <!-- Webhook setup hint -->
        @if (!status.clickUp.webhookConfigured) {
          <div class="hint-box">
            <mat-icon>info</mat-icon>
            <div>
              <strong>איך מגדירים Webhook?</strong>
              אחרי העלאה לענן, שלח קריאה ל:
              <code>POST /api/clickup/webhook/register</code>
              עם <code>{{ '{ "endpointUrl": "https://your-domain.com/api/clickup/webhook" }' }}</code>
              — תקבל secret לשמור ב-appsettings תחת <code>ClickUp:WebhookSecret</code>.
            </div>
          </div>
        }

        <!-- Mapping Table -->
        <div class="section">
          <div class="section-header">
            <div>
              <h2>מיפוי פרויקטים ↔ ClickUp Lists</h2>
              <p>קשר כל פרויקט ב-TimeIn לרשימת משימות ב-ClickUp</p>
            </div>
          </div>

          <div class="mapping-table">
            <div class="mapping-head">
              <span>פרויקט</span>
              <span>ClickUp List ID</span>
              <span>סנכרון אחרון</span>
              <span>פעולות</span>
            </div>

            @for (m of status.clickUp.projectMappings; track m.projectId) {
              <div class="mapping-row" [class.row-mapped]="m.clickUpListId">
                <div class="project-cell">
                  <div class="project-dot" [class.dot-mapped]="m.clickUpListId"></div>
                  <span class="project-name">{{ m.projectName }}</span>
                </div>

                <div class="list-id-cell">
                  @if (editingId === m.projectId) {
                    <input class="list-id-input" [(ngModel)]="editingValue"
                      placeholder="לדוגמה: 901817777288"
                      (keyup.enter)="saveMapping(m)"
                      (keyup.escape)="cancelEdit()" />
                  } @else if (m.clickUpListId) {
                    <span class="list-id-chip">
                      <mat-icon>list</mat-icon>
                      {{ m.clickUpListId }}
                    </span>
                  } @else {
                    <span class="list-id-empty">לא מוגדר</span>
                  }
                </div>

                <div class="sync-cell">
                  @if (m.lastSyncedAt) {
                    <span class="sync-time">
                      <mat-icon>check_circle</mat-icon>
                      {{ m.lastSyncedAt | date:'dd/MM HH:mm' }}
                      @if (m.tasksSynced != null) {
                        <span class="task-count">({{ m.tasksSynced }} משימות)</span>
                      }
                    </span>
                  } @else if (m.clickUpListId) {
                    <span class="sync-never">טרם סונכרן בסשן זה</span>
                  } @else {
                    <span class="sync-na">—</span>
                  }
                </div>

                <div class="actions-cell">
                  @if (editingId === m.projectId) {
                    <button class="btn-save" (click)="saveMapping(m)">שמור</button>
                    <button class="btn-cancel-sm" (click)="cancelEdit()">ביטול</button>
                  } @else {
                    <button class="btn-icon" (click)="startEdit(m)" matTooltip="ערוך List ID">
                      <mat-icon>edit</mat-icon>
                    </button>
                    @if (m.clickUpListId) {
                      <button class="btn-icon btn-sync" [class.spinning]="syncingId === m.projectId"
                        (click)="syncOne(m)" matTooltip="סנכרן עכשיו" [disabled]="syncingId === m.projectId">
                        <mat-icon>sync</mat-icon>
                      </button>
                      <button class="btn-icon btn-unlink" (click)="removeMapping(m)" matTooltip="הסר קישור">
                        <mat-icon>link_off</mat-icon>
                      </button>
                    }
                  }
                </div>
              </div>
            }
          </div>
        </div>

      }
    </div>
  `,
  styles: [`
    .page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;
    }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; color: #1e1b4b; }
    .header-sub { margin: 0; color: #6b7280; font-size: 14px; }

    .btn-sync-all {
      display: flex; align-items: center; gap: 8px;
      height: 44px; padding: 0 22px; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; font-size: 14px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.2s;
    }
    .btn-sync-all:hover:not(:disabled) { box-shadow: 0 4px 16px rgba(79,70,229,0.35); transform: translateY(-1px); }
    .btn-sync-all:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sync-all mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-sync-all.loading mat-icon { animation: spin 1s linear infinite; }

    /* Loading */
    .loading-state { display: flex; align-items: center; gap: 12px; color: #6b7280; padding: 48px; justify-content: center; }
    .spinner {
      width: 24px; height: 24px; border: 3px solid #e5e7eb;
      border-top-color: #4f46e5; border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    /* Status Cards */
    .cards-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .status-card {
      display: flex; align-items: center; gap: 16px;
      background: white; border-radius: 16px;
      padding: 20px 24px;
      border: 1.5px solid #f3f4f6;
      box-shadow: 0 2px 8px rgba(30,27,75,0.05);
      transition: box-shadow 0.2s;
    }
    .status-card.connected { border-color: #d1fae5; }
    .status-card.disconnected { border-color: #fee2e2; }

    .card-icon-wrap {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .card-icon-wrap mat-icon { font-size: 24px; width: 24px; height: 24px; color: white; }
    .icon-green { background: linear-gradient(135deg, #10b981, #059669); }
    .icon-red { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .icon-orange { background: linear-gradient(135deg, #f59e0b, #d97706); }

    .card-body { flex: 1; }
    .card-title { font-size: 15px; font-weight: 700; color: #1e1b4b; margin-bottom: 4px; }
    .card-meta { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280; }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .status-dot.green { background: #10b981; box-shadow: 0 0 0 2px #d1fae5; }
    .status-dot.red { background: #ef4444; box-shadow: 0 0 0 2px #fee2e2; }
    .status-dot.orange { background: #f59e0b; box-shadow: 0 0 0 2px #fef3c7; }

    .card-badge {
      font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; flex-shrink: 0;
    }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-orange { background: #fef3c7; color: #92400e; }

    /* Hint box */
    .hint-box {
      display: flex; gap: 12px; align-items: flex-start;
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px;
      padding: 14px 18px; margin-bottom: 24px;
      font-size: 13px; color: #78350f; line-height: 1.6;
    }
    .hint-box mat-icon { color: #d97706; flex-shrink: 0; margin-top: 2px; }
    .hint-box code {
      background: #fef3c7; padding: 1px 6px; border-radius: 4px;
      font-size: 12px; font-family: monospace;
    }

    /* Section */
    .section { margin-top: 24px; }
    .section-header { margin-bottom: 16px; }
    h2 { margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #1e1b4b; }
    .section-header p { margin: 0; font-size: 13px; color: #9ca3af; }

    /* Mapping Table */
    .mapping-table {
      background: white; border-radius: 16px;
      border: 1px solid #f3f4f6;
      box-shadow: 0 2px 8px rgba(30,27,75,0.05);
      overflow: hidden;
    }
    .mapping-head {
      display: grid; grid-template-columns: 2fr 2fr 2fr 1.2fr;
      padding: 12px 20px;
      background: #f9f8ff;
      font-size: 12px; font-weight: 700; color: #6b7280;
      border-bottom: 1px solid #f3f4f6;
    }
    .mapping-row {
      display: grid; grid-template-columns: 2fr 2fr 2fr 1.2fr;
      padding: 16px 20px; align-items: center;
      border-bottom: 1px solid #f9fafb;
      transition: background 0.15s;
    }
    .mapping-row:last-child { border-bottom: none; }
    .mapping-row:hover { background: #fafafe; }
    .mapping-row.row-mapped { background: #fafffe; }

    .project-cell { display: flex; align-items: center; gap: 10px; }
    .project-dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: #e5e7eb; flex-shrink: 0;
    }
    .project-dot.dot-mapped { background: #10b981; box-shadow: 0 0 0 2px #d1fae5; }
    .project-name { font-weight: 600; color: #1e1b4b; font-size: 14px; }

    .list-id-chip {
      display: inline-flex; align-items: center; gap: 5px;
      background: #ede9fe; color: #5b21b6;
      font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 8px;
      font-family: monospace;
    }
    .list-id-chip mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .list-id-empty { font-size: 13px; color: #d1d5db; font-style: italic; }
    .list-id-input {
      width: 90%; height: 34px; padding: 0 10px;
      border: 1.5px solid #818cf8; border-radius: 8px;
      font-size: 13px; font-family: monospace; outline: none;
      background: #fafafe; color: #1e1b4b;
    }
    .list-id-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }

    .sync-cell { font-size: 12px; }
    .sync-time {
      display: flex; align-items: center; gap: 5px; color: #059669;
      font-weight: 600;
    }
    .sync-time mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .task-count { font-weight: 400; color: #6b7280; }
    .sync-never { color: #9ca3af; font-style: italic; }
    .sync-na { color: #e5e7eb; }

    .actions-cell { display: flex; align-items: center; gap: 4px; }
    .btn-icon {
      width: 32px; height: 32px; border: none; border-radius: 8px;
      background: transparent; cursor: pointer; display: flex;
      align-items: center; justify-content: center; transition: all 0.15s;
      color: #9ca3af;
    }
    .btn-icon mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .btn-icon:hover { background: #f3f4f6; color: #4f46e5; }
    .btn-icon.btn-sync:hover { color: #059669; }
    .btn-icon.btn-unlink:hover { color: #ef4444; background: #fee2e2; }
    .btn-icon.spinning mat-icon { animation: spin 0.7s linear infinite; }

    .btn-save {
      height: 30px; padding: 0 14px; border: none; border-radius: 6px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer;
    }
    .btn-save:hover { opacity: 0.88; }
    .btn-cancel-sm {
      height: 30px; padding: 0 10px; border: 1px solid #e5e7eb; border-radius: 6px;
      background: white; color: #6b7280; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer;
    }

    /* Git Card */
    .git-card {
      background: white; border-radius: 16px; margin-bottom: 16px;
      border: 1.5px solid #f3f4f6;
      box-shadow: 0 2px 8px rgba(30,27,75,0.05);
      overflow: hidden;
    }
    .git-card-header {
      display: flex; align-items: center; gap: 16px; padding: 20px 24px;
    }
    .git-icon-wrap {
      width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
      background: linear-gradient(135deg, #1e1b4b, #4f46e5);
      display: flex; align-items: center; justify-content: center;
    }
    .git-icon-wrap mat-icon { color: white; font-size: 24px; width: 24px; height: 24px; }
    .git-title { font-size: 15px; font-weight: 700; color: #1e1b4b; }
    .git-remote { font-size: 12px; color: #6b7280; font-family: monospace; margin-top: 2px; }
    .git-badge {
      margin-right: auto; font-size: 12px; font-weight: 700;
      padding: 4px 12px; border-radius: 20px;
    }
    .git-badge-ok { background: #d1fae5; color: #065f46; }
    .git-badge-no { background: #f3f4f6; color: #9ca3af; }
    .git-details {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 0; border-top: 1px solid #f3f4f6;
    }
    .git-detail {
      display: flex; align-items: center; gap: 8px; padding: 12px 24px;
      font-size: 13px; color: #374151; border-bottom: 1px solid #f9fafb;
    }
    .git-detail mat-icon { font-size: 16px; width: 16px; height: 16px; color: #9ca3af; flex-shrink: 0; }
    .git-detail-label { color: #9ca3af; font-size: 12px; min-width: 70px; }
    .git-branch {
      background: #ede9fe; color: #5b21b6;
      font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 6px;
      font-family: monospace;
    }
    .git-hash {
      background: #f3f4f6; color: #374151;
      font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px;
      font-family: monospace; flex-shrink: 0;
    }
    .git-msg { color: #6b7280; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class IntegrationsComponent implements OnInit {
  status: IntegrationStatus | null = null;
  git: GitInfo | null = null;
  loading = true;
  syncingAll = false;
  syncingId: number | null = null;
  editingId: number | null = null;
  editingValue = '';

  constructor(
    private integrationService: IntegrationService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.loadStatus(); }

  loadStatus() {
    this.loading = true;
    this.integrationService.getStatus().subscribe({
      next: s => {
        Promise.resolve().then(() => {
          this.status = s;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        Promise.resolve().then(() => {
          this.loading = false;
          this.cdr.detectChanges();
          this.snackBar.open('שגיאה בטעינת הסטטוס', 'סגור', { duration: 3000 });
        });
      }
    });
    this.integrationService.getGitInfo().subscribe({
      next: g => {
        Promise.resolve().then(() => { this.git = g; this.cdr.detectChanges(); });
      },
      error: () => {
        Promise.resolve().then(() => { this.git = { isRepo: false }; this.cdr.detectChanges(); });
      }
    });
  }

  get hasMappedProjects(): boolean {
    return !!this.status?.clickUp.projectMappings.some(m => m.clickUpListId);
  }

  startEdit(m: ProjectMapping) {
    this.editingId = m.projectId;
    this.editingValue = m.clickUpListId ?? '';
  }

  cancelEdit() { this.editingId = null; this.editingValue = ''; }

  saveMapping(m: ProjectMapping) {
    const val = this.editingValue.trim() || null;
    this.integrationService.updateMapping(m.projectId, val).subscribe({
      next: () => {
        m.clickUpListId = val ?? undefined;
        this.cancelEdit();
        this.snackBar.open('הקישור עודכן', 'סגור', { duration: 2000 });
      },
      error: () => this.snackBar.open('שגיאה בעדכון', 'סגור', { duration: 3000 })
    });
  }

  removeMapping(m: ProjectMapping) {
    this.integrationService.updateMapping(m.projectId, null).subscribe({
      next: () => {
        m.clickUpListId = undefined;
        m.lastSyncedAt = undefined;
        m.tasksSynced = undefined;
        this.snackBar.open('הקישור הוסר', 'סגור', { duration: 2000 });
      },
      error: () => this.snackBar.open('שגיאה', 'סגור', { duration: 3000 })
    });
  }

  syncOne(m: ProjectMapping) {
    this.syncingId = m.projectId;
    this.integrationService.syncOne(m.projectId).subscribe({
      next: (r) => {
        this.syncingId = null;
        m.lastSyncedAt = new Date().toISOString();
        m.tasksSynced = (r.created ?? 0) + (r.updated ?? 0);
        this.snackBar.open(`סונכרנו ${r.created ?? 0} חדשות, ${r.updated ?? 0} עודכנו`, 'סגור', { duration: 3000 });
      },
      error: () => { this.syncingId = null; this.snackBar.open('סנכרון נכשל', 'סגור', { duration: 3000 }); }
    });
  }

  syncAll() {
    this.syncingAll = true;
    this.integrationService.syncAll().subscribe({
      next: (results) => {
        this.syncingAll = false;
        const total = results.reduce((s, r) => s + (r.created ?? 0) + (r.updated ?? 0), 0);
        this.snackBar.open(`סנכרון הושלם — ${total} משימות`, 'סגור', { duration: 3000 });
        this.loadStatus();
      },
      error: () => { this.syncingAll = false; this.snackBar.open('סנכרון נכשל', 'סגור', { duration: 3000 }); }
    });
  }
}
