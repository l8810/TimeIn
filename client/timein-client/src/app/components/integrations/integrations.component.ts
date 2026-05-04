import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { IntegrationService, IntegrationStatus, ProjectMapping, GitInfo, ConnectionSettings } from '../../services/integration.service';

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

      <!-- Connection Settings Card -->
      @if (connSettings) {
        <div class="conn-card">
          <div class="conn-card-title">
            <mat-icon>settings_ethernet</mat-icon>
            הגדרות חיבור
          </div>

          <!-- ClickUp API Key -->
          <div class="conn-section">
            <div class="conn-section-header">
              <div class="conn-label">
                <mat-icon>vpn_key</mat-icon>
                ClickUp API Key
              </div>
              <div class="conn-status-badge" [class.badge-green]="connSettings.clickUpApiKeyConfigured" [class.badge-red]="!connSettings.clickUpApiKeyConfigured">
                {{ connSettings.clickUpApiKeyConfigured ? 'מוגדר' : 'לא מוגדר' }}
              </div>
            </div>
            <div class="conn-input-row">
              <div class="input-wrap">
                <input class="conn-input" [type]="showApiKey ? 'text' : 'password'"
                  [(ngModel)]="newApiKey"
                  [placeholder]="connSettings.clickUpApiKeyMasked || 'הזן API Key...'" />
                <button class="btn-eye" (click)="showApiKey = !showApiKey" matTooltip="{{ showApiKey ? 'הסתר' : 'הצג' }}">
                  <mat-icon>{{ showApiKey ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
              <button class="btn-test" [class.testing]="testingKey" (click)="testKey()" [disabled]="!newApiKey || testingKey">
                <mat-icon>{{ testingKey ? 'sync' : 'wifi_tethering' }}</mat-icon>
                {{ testingKey ? 'בודק...' : 'בדוק חיבור' }}
              </button>
              <button class="btn-save-conn" (click)="saveApiKey()" [disabled]="!newApiKey || savingConn">
                <mat-icon>save</mat-icon>
                שמור
              </button>
            </div>
            @if (testResult !== null) {
              <div class="test-result" [class.result-ok]="testResult" [class.result-fail]="!testResult">
                <mat-icon>{{ testResult ? 'check_circle' : 'cancel' }}</mat-icon>
                {{ testResult ? 'החיבור הצליח' + (testWorkspace ? ' — ' + testWorkspace : '') : 'החיבור נכשל — בדוק את ה-Key' }}
              </div>
            }
          </div>

          <!-- Git Remote URL -->
          <div class="conn-section conn-section-border">
            <div class="conn-section-header">
              <div class="conn-label">
                <mat-icon>link</mat-icon>
                Git Remote URL
              </div>
              <div class="conn-status-badge" [class.badge-green]="!!connSettings.gitRemoteUrl" [class.badge-red]="!connSettings.gitRemoteUrl">
                {{ connSettings.gitRemoteUrl ? 'מחובר' : 'לא מוגדר' }}
              </div>
            </div>
            @if (connSettings.gitRemoteUrl && !editingGitUrl) {
              <div class="current-url">
                <mat-icon>public</mat-icon>
                <span class="url-text">{{ connSettings.gitRemoteUrl }}</span>
                <button class="btn-edit-url" (click)="startEditGitUrl()">
                  <mat-icon>edit</mat-icon>
                </button>
              </div>
            } @else {
              <div class="conn-input-row">
                <input class="conn-input" type="text" [(ngModel)]="newGitUrl"
                  placeholder="https://github.com/username/repo.git" />
                <button class="btn-save-conn" (click)="saveGitUrl()" [disabled]="!newGitUrl || savingConn">
                  <mat-icon>save</mat-icon>
                  שמור
                </button>
                @if (connSettings.gitRemoteUrl) {
                  <button class="btn-cancel-conn" (click)="cancelEditGitUrl()">ביטול</button>
                }
              </div>
            }
          </div>
        </div>
      }

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
    .page { max-width: 960px; margin: 0 auto; padding: 28px 24px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;
    }
    h1 { margin: 0 0 3px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px; }
    .header-sub { margin: 0; color: #64748b; font-size: 13px; }

    /* Connection Settings Card */
    .conn-card {
      background: white; border-radius: 10px; margin-bottom: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.07);
      overflow: hidden;
    }
    .conn-card-title {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 20px; background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px; font-weight: 700; color: #0f172a;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .conn-card-title mat-icon { color: #2563eb; font-size: 18px; width: 18px; height: 18px; }
    .conn-section { padding: 18px 20px; }
    .conn-section-border { border-top: 1px solid #f1f5f9; }
    .conn-section-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
    }
    .conn-label {
      display: flex; align-items: center; gap: 7px;
      font-size: 13px; font-weight: 600; color: #374151;
    }
    .conn-label mat-icon { font-size: 17px; width: 17px; height: 17px; color: #64748b; }
    .conn-input-row { display: flex; align-items: center; gap: 8px; }
    .input-wrap { position: relative; flex: 1; }
    .conn-input {
      width: 100%; height: 36px; padding: 0 36px 0 10px;
      border: 1.5px solid #e2e8f0; border-radius: 6px;
      font-size: 13px; font-family: monospace; outline: none;
      color: #0f172a; background: #f8fafc; box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .conn-input:focus { border-color: #2563eb; background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
    .btn-eye {
      position: absolute; left: 6px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; color: #94a3b8; padding: 2px;
      display: flex; align-items: center;
    }
    .btn-eye mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .btn-test {
      display: flex; align-items: center; gap: 6px; white-space: nowrap;
      height: 36px; padding: 0 14px; border: 1.5px solid #e2e8f0; border-radius: 6px;
      background: white; color: #374151; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .btn-test:hover:not(:disabled) { border-color: #2563eb; color: #1d4ed8; }
    .btn-test:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-test mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-test.testing mat-icon { animation: spin 0.8s linear infinite; }
    .btn-save-conn {
      display: flex; align-items: center; gap: 6px; white-space: nowrap;
      height: 36px; padding: 0 16px; border: none; border-radius: 6px;
      background: #1e40af; color: white; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .btn-save-conn:hover:not(:disabled) { background: #1d4ed8; }
    .btn-save-conn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-save-conn mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .btn-cancel-conn {
      height: 36px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 6px;
      background: white; color: #64748b; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer;
    }
    .test-result {
      display: flex; align-items: center; gap: 6px;
      margin-top: 10px; font-size: 12.5px; font-weight: 600; padding: 8px 12px;
      border-radius: 6px;
    }
    .test-result mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .result-ok { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .result-fail { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .current-url {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; background: #f8fafc; border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .current-url mat-icon { font-size: 16px; width: 16px; height: 16px; color: #64748b; flex-shrink: 0; }
    .url-text { flex: 1; font-size: 12.5px; font-family: monospace; color: #374151; word-break: break-all; }
    .btn-edit-url {
      background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px;
      display: flex; align-items: center; transition: color 0.15s; border-radius: 4px;
    }
    .btn-edit-url:hover { color: #2563eb; background: #eff6ff; }
    .btn-edit-url mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .btn-sync-all {
      display: flex; align-items: center; gap: 8px;
      height: 38px; padding: 0 18px; border: none; border-radius: 6px;
      background: #1e40af;
      color: white; font-size: 13px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .btn-sync-all:hover:not(:disabled) { background: #1d4ed8; }
    .btn-sync-all:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sync-all mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .btn-sync-all.loading mat-icon { animation: spin 1s linear infinite; }

    /* Loading */
    .loading-state { display: flex; align-items: center; gap: 12px; color: #6b7280; padding: 48px; justify-content: center; }
    .spinner {
      width: 24px; height: 24px; border: 3px solid #e5e7eb;
      border-top-color: #4f46e5; border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    /* Status Cards */
    .cards-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .status-card {
      display: flex; align-items: center; gap: 14px;
      background: white; border-radius: 8px;
      padding: 16px 18px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .status-card.connected { border-color: #bbf7d0; }
    .status-card.disconnected { border-color: #fecaca; }

    .card-icon-wrap {
      width: 42px; height: 42px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .card-icon-wrap mat-icon { font-size: 22px; width: 22px; height: 22px; color: white; }
    .icon-green { background: #059669; }
    .icon-red { background: #dc2626; }
    .icon-orange { background: #d97706; }

    .card-body { flex: 1; }
    .card-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
    .card-meta { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #64748b; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .status-dot.green { background: #10b981; }
    .status-dot.red { background: #ef4444; }
    .status-dot.orange { background: #f59e0b; }

    .card-badge {
      font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px; flex-shrink: 0;
    }
    .badge-green { background: #dcfce7; color: #166534; }
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
      background: white; border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      overflow: hidden;
    }
    .mapping-head {
      display: grid; grid-template-columns: 2fr 2fr 2fr 1.2fr;
      padding: 10px 18px;
      background: #f8fafc;
      font-size: 11px; font-weight: 700; color: #475569;
      text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }
    .mapping-row {
      display: grid; grid-template-columns: 2fr 2fr 2fr 1.2fr;
      padding: 14px 18px; align-items: center;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s;
    }
    .mapping-row:last-child { border-bottom: none; }
    .mapping-row:hover { background: #f8fafc; }
    .mapping-row.row-mapped { background: white; }

    .project-cell { display: flex; align-items: center; gap: 10px; }
    .project-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; flex-shrink: 0; }
    .project-dot.dot-mapped { background: #10b981; }
    .project-name { font-weight: 600; color: #0f172a; font-size: 13.5px; }

    .list-id-chip {
      display: inline-flex; align-items: center; gap: 5px;
      background: #dbeafe; color: #1e40af;
      font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 5px;
      font-family: monospace;
    }
    .list-id-chip mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .list-id-empty { font-size: 12.5px; color: #cbd5e1; font-style: italic; }
    .list-id-input {
      width: 90%; height: 32px; padding: 0 10px;
      border: 1.5px solid #2563eb; border-radius: 6px;
      font-size: 13px; font-family: monospace; outline: none;
      background: white; color: #0f172a;
    }
    .list-id-input:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

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
      height: 30px; padding: 0 14px; border: none; border-radius: 5px;
      background: #1e40af;
      color: white; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer;
    }
    .btn-save:hover { background: #1d4ed8; }
    .btn-cancel-sm {
      height: 30px; padding: 0 10px; border: 1px solid #e2e8f0; border-radius: 5px;
      background: white; color: #64748b; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer;
    }

    /* Git Card */
    .git-card {
      background: white; border-radius: 8px; margin-bottom: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      overflow: hidden;
    }
    .git-card-header {
      display: flex; align-items: center; gap: 14px; padding: 16px 20px;
    }
    .git-icon-wrap {
      width: 42px; height: 42px; border-radius: 8px; flex-shrink: 0;
      background: #1e293b;
      display: flex; align-items: center; justify-content: center;
    }
    .git-icon-wrap mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .git-title { font-size: 14px; font-weight: 700; color: #0f172a; }
    .git-remote { font-size: 11.5px; color: #64748b; font-family: monospace; margin-top: 2px; }
    .git-badge {
      margin-right: auto; font-size: 11px; font-weight: 700;
      padding: 3px 10px; border-radius: 4px;
    }
    .git-badge-ok { background: #dcfce7; color: #166534; }
    .git-badge-no { background: #f1f5f9; color: #94a3b8; }
    .git-details {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 0; border-top: 1px solid #f1f5f9;
    }
    .git-detail {
      display: flex; align-items: center; gap: 8px; padding: 11px 20px;
      font-size: 12.5px; color: #374151; border-bottom: 1px solid #f8fafc;
    }
    .git-detail mat-icon { font-size: 15px; width: 15px; height: 15px; color: #94a3b8; flex-shrink: 0; }
    .git-detail-label { color: #94a3b8; font-size: 11px; min-width: 70px; }
    .git-branch {
      background: #dbeafe; color: #1e40af;
      font-size: 11.5px; font-weight: 600; padding: 2px 7px; border-radius: 4px;
      font-family: monospace;
    }
    .git-hash {
      background: #f1f5f9; color: #374151;
      font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 3px;
      font-family: monospace; flex-shrink: 0;
    }
    .git-msg { color: #64748b; font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }

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

  // Connection settings
  connSettings: ConnectionSettings | null = null;
  newApiKey = '';
  showApiKey = false;
  testingKey = false;
  testResult: boolean | null = null;
  testWorkspace: string | null = null;
  savingConn = false;
  newGitUrl = '';
  editingGitUrl = false;

  constructor(
    private integrationService: IntegrationService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadStatus();
    this.loadConnSettings();
  }

  loadConnSettings() {
    this.integrationService.getConnectionSettings().subscribe({
      next: s => {
        Promise.resolve().then(() => { this.connSettings = s; this.cdr.detectChanges(); });
      },
      error: () => {}
    });
  }

  testKey() {
    if (!this.newApiKey) return;
    this.testingKey = true;
    this.testResult = null;
    this.integrationService.testClickUpKey(this.newApiKey).subscribe({
      next: r => {
        Promise.resolve().then(() => {
          this.testingKey = false;
          this.testResult = r.isConnected;
          this.testWorkspace = r.workspaceName ?? null;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        Promise.resolve().then(() => {
          this.testingKey = false;
          this.testResult = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  saveApiKey() {
    if (!this.newApiKey) return;
    this.savingConn = true;
    this.integrationService.updateConnectionSettings({ clickUpApiKey: this.newApiKey }).subscribe({
      next: () => {
        Promise.resolve().then(() => {
          this.savingConn = false;
          this.newApiKey = '';
          this.testResult = null;
          this.snackBar.open('API Key עודכן בהצלחה', 'סגור', { duration: 2500 });
          this.loadConnSettings();
          this.loadStatus();
          this.cdr.detectChanges();
        });
      },
      error: () => {
        Promise.resolve().then(() => {
          this.savingConn = false;
          this.snackBar.open('שגיאה בשמירת ה-API Key', 'סגור', { duration: 3000 });
          this.cdr.detectChanges();
        });
      }
    });
  }

  startEditGitUrl() {
    this.newGitUrl = this.connSettings?.gitRemoteUrl ?? '';
    this.editingGitUrl = true;
  }

  cancelEditGitUrl() {
    this.editingGitUrl = false;
    this.newGitUrl = '';
  }

  saveGitUrl() {
    if (!this.newGitUrl) return;
    this.savingConn = true;
    this.integrationService.updateConnectionSettings({ gitRemoteUrl: this.newGitUrl }).subscribe({
      next: () => {
        Promise.resolve().then(() => {
          this.savingConn = false;
          this.editingGitUrl = false;
          this.snackBar.open('Git URL עודכן בהצלחה', 'סגור', { duration: 2500 });
          this.loadConnSettings();
          this.cdr.detectChanges();
        });
      },
      error: () => {
        Promise.resolve().then(() => {
          this.savingConn = false;
          this.snackBar.open('שגיאה בעדכון ה-Git URL', 'סגור', { duration: 3000 });
          this.cdr.detectChanges();
        });
      }
    });
  }

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
