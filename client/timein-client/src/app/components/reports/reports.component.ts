import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { ReportService } from '../../services/report.service';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { TimeEntryService } from '../../services/time-entry.service';
import { Project, Task } from '../../models/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatTabsModule,
    MatTooltipModule, MatChipsModule, MatSnackBarModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>דוחות</h1>
          <p class="header-sub">ניתוח שעות עבודה</p>
        </div>
      </div>

      <div class="table-card">
        <mat-tab-group (selectedIndexChange)="onTabChange($event)">

          <!-- ── Tab 0: All entries ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">list_alt</mat-icon> כל הדיווחים
            </ng-template>

            <!-- Filter bar -->
            <div class="filter-strip">
              <mat-form-field appearance="outline" class="ff">
                <mat-label>עובד</mat-label>
                <mat-select [(ngModel)]="ef.userId" (ngModelChange)="onEntryFilterChange()">
                  <mat-option [value]="null">כל העובדים</mat-option>
                  @for (u of users; track u.userId) {
                    <mat-option [value]="u.userId">{{ u.fullName }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="ff">
                <mat-label>פרויקט</mat-label>
                <mat-select [(ngModel)]="ef.projectId" (ngModelChange)="onEntryProjectChange()">
                  <mat-option [value]="null">כל הפרויקטים</mat-option>
                  @for (p of projects; track p.projectId) {
                    <mat-option [value]="p.projectId">{{ p.projectName }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="ff">
                <mat-label>משימה</mat-label>
                <mat-select [(ngModel)]="ef.taskId" (ngModelChange)="onEntryFilterChange()" [disabled]="!ef.projectId">
                  <mat-option [value]="null">כל המשימות</mat-option>
                  @for (t of entryTasks; track t.taskId) {
                    <mat-option [value]="t.taskId">{{ t.taskName }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="ff">
                <mat-label>סטטוס</mat-label>
                <mat-select [(ngModel)]="ef.status" (ngModelChange)="onEntryFilterChange()">
                  <mat-option [value]="null">הכל (לא כולל טיוטות)</mat-option>
                  <mat-option value="Submitted">ממתין לאישור</mat-option>
                  <mat-option value="Approved">אושר</mat-option>
                  <mat-option value="Rejected">נדחה</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="ff-date">
                <mat-label>מתאריך</mat-label>
                <input matInput type="date" [(ngModel)]="ef.fromDate" (change)="onEntryFilterChange()" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="ff-date">
                <mat-label>עד תאריך</mat-label>
                <input matInput type="date" [(ngModel)]="ef.toDate" (change)="onEntryFilterChange()" />
              </mat-form-field>

              <div class="preset-btns">
                <button class="chip-sm" (click)="setEntryPreset('today')">היום</button>
                <button class="chip-sm" (click)="setEntryPreset('week')">שבוע זה</button>
                <button class="chip-sm" (click)="setEntryPreset('month')">חודש זה</button>
              </div>

              <button class="btn-clear" (click)="clearEntryFilters()" matTooltip="נקה סינון">
                <mat-icon>filter_list_off</mat-icon>
              </button>
            </div>

            <!-- Summary bar -->
            @if (entriesLoaded) {
              <div class="summary-bar">
                <div class="summary-chip">
                  <mat-icon>receipt_long</mat-icon>
                  <span><strong>{{ entryResult.totalCount }}</strong> רשומות</span>
                </div>
                <div class="summary-chip highlight">
                  <mat-icon>schedule</mat-icon>
                  <span>סה"כ <strong>{{ formatHours(entryResult.totalHours) }}</strong> שעות</span>
                </div>
              </div>
            }

            <!-- Table -->
            <div class="table-wrap">
              <table mat-table [dataSource]="entryResult.entries" class="main-table">

                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>תאריך</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="date-chip">{{ r.date | date:'d/M/yy' }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="employee">
                  <th mat-header-cell *matHeaderCellDef>עובד</th>
                  <td mat-cell *matCellDef="let r">
                    <div class="user-cell">
                      <div class="avatar">{{ initials(r.userName) }}</div>
                      <span>{{ r.userName }}</span>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="project">
                  <th mat-header-cell *matHeaderCellDef>פרויקט</th>
                  <td mat-cell *matCellDef="let r">
                    <strong class="project-name">{{ r.projectName }}</strong>
                  </td>
                </ng-container>

                <ng-container matColumnDef="task">
                  <th mat-header-cell *matHeaderCellDef>משימה</th>
                  <td mat-cell *matCellDef="let r">
                    @if (r.taskName || r.manualTaskName) {
                      <div class="task-cell">
                        <span class="task-chip">{{ r.taskName || r.manualTaskName }}</span>
                        @if (r.clickUpUrl) {
                          <a [href]="r.clickUpUrl" target="_blank" class="cu-link-icon" matTooltip="פתח ב-ClickUp">
                            <mat-icon>open_in_new</mat-icon>
                          </a>
                        }
                      </div>
                    } @else {
                      <span class="no-task">—</span>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="duration">
                  <th mat-header-cell *matHeaderCellDef>משך</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="duration-badge">{{ formatMinutes(r.durationMinutes) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>תיאור</th>
                  <td mat-cell *matCellDef="let r" class="desc-cell">
                    {{ r.description || '—' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>סטטוס</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="badge" [class]="'badge-' + r.status?.toLowerCase()">{{ statusLabel(r.status) }}</span>
                    @if (r.status === 'Rejected' && r.rejectionReason) {
                      <span class="rejection-hint" [matTooltip]="r.rejectionReason">
                        <mat-icon>info_outline</mat-icon>
                      </span>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="approval">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let r">
                    @if (r.status === 'Submitted') {
                      <div class="approval-actions">
                        <button class="btn-approve" (click)="approveEntry(r)" matTooltip="אשר">
                          <mat-icon>check_circle</mat-icon> אשר
                        </button>
                        <button class="btn-reject-entry" (click)="openRejectPanel(r)" matTooltip="דחה">
                          <mat-icon>cancel</mat-icon> דחה
                        </button>
                      </div>
                    }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="entryCols; sticky: true"></tr>
                <tr mat-row *matRowDef="let row; columns: entryCols;" class="table-row"></tr>
              </table>

              @if (!entriesLoaded) {
                <div class="empty-state">
                  <mat-icon>manage_search</mat-icon>
                  <p>בחר פילטרים וטען נתונים</p>
                </div>
              } @else if (!entryResult.entries.length) {
                <div class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>לא נמצאו דיווחים עם הפילטרים שנבחרו</p>
                </div>
              }
            </div>
          </mat-tab>

          <!-- ── Tab 1: By employee ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">person</mat-icon> לפי עובד
            </ng-template>
            <div class="filter-strip">
              <mat-form-field appearance="outline" class="ff">
                <mat-label>פרויקט</mat-label>
                <mat-select [(ngModel)]="filter.projectId">
                  <mat-option [value]="null">כל הפרויקטים</mat-option>
                  @for (p of projects; track p.projectId) {
                    <mat-option [value]="p.projectId">{{ p.projectName }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="ff-date">
                <mat-label>מתאריך</mat-label>
                <input matInput type="date" [(ngModel)]="filter.fromDate" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="ff-date">
                <mat-label>עד תאריך</mat-label>
                <input matInput type="date" [(ngModel)]="filter.toDate" />
              </mat-form-field>
              <div class="preset-btns">
                <button class="chip-sm" (click)="setPreset('today')">היום</button>
                <button class="chip-sm" (click)="setPreset('week')">שבוע זה</button>
                <button class="chip-sm" (click)="setPreset('month')">חודש זה</button>
              </div>
              <button class="btn-primary" (click)="loadReports()">
                <mat-icon>bar_chart</mat-icon> הפק דוח
              </button>
            </div>
            <div class="table-wrap">
              <table mat-table [dataSource]="userReport" class="main-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>עובד</th>
                  <td mat-cell *matCellDef="let r">
                    <div class="user-cell"><div class="avatar">{{ initials(r.fullName) }}</div><strong>{{ r.fullName }}</strong></div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="hours">
                  <th mat-header-cell *matHeaderCellDef>סה"כ שעות</th>
                  <td mat-cell *matCellDef="let r"><span class="duration-badge">{{ formatHours(r.totalHours) }}</span></td>
                </ng-container>
                <ng-container matColumnDef="entries">
                  <th mat-header-cell *matHeaderCellDef>רשומות</th>
                  <td mat-cell *matCellDef="let r">{{ r.totalEntries }}</td>
                </ng-container>
                <ng-container matColumnDef="projects">
                  <th mat-header-cell *matHeaderCellDef>פרויקטים</th>
                  <td mat-cell *matCellDef="let r">{{ r.activeProjects }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="userCols"></tr>
                <tr mat-row *matRowDef="let row; columns: userCols;" class="table-row"></tr>
              </table>
              @if (!userReport.length) { <div class="empty-state"><mat-icon>bar_chart</mat-icon><p>לא נמצאו נתונים</p></div> }
            </div>
          </mat-tab>

          <!-- ── Tab 2: By project ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">folder_open</mat-icon> לפי פרויקט
            </ng-template>
            <div class="filter-strip">
              <mat-form-field appearance="outline" class="ff-date">
                <mat-label>מתאריך</mat-label>
                <input matInput type="date" [(ngModel)]="filter.fromDate" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="ff-date">
                <mat-label>עד תאריך</mat-label>
                <input matInput type="date" [(ngModel)]="filter.toDate" />
              </mat-form-field>
              <div class="preset-btns">
                <button class="chip-sm" (click)="setPreset('today')">היום</button>
                <button class="chip-sm" (click)="setPreset('week')">שבוע זה</button>
                <button class="chip-sm" (click)="setPreset('month')">חודש זה</button>
              </div>
              <button class="btn-primary" (click)="loadReports()">
                <mat-icon>bar_chart</mat-icon> הפק דוח
              </button>
            </div>
            <div class="table-wrap">
              <table mat-table [dataSource]="projectReport" class="main-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>פרויקט</th>
                  <td mat-cell *matCellDef="let r"><strong class="project-name">{{ r.projectName }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="hours">
                  <th mat-header-cell *matHeaderCellDef>סה"כ שעות</th>
                  <td mat-cell *matCellDef="let r"><span class="duration-badge">{{ formatHours(r.totalHours) }}</span></td>
                </ng-container>
                <ng-container matColumnDef="workers">
                  <th mat-header-cell *matHeaderCellDef>עובדים</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="names-list">{{ r.workers?.length ? r.workers.join(', ') : r.totalEmployees }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="tasks">
                  <th mat-header-cell *matHeaderCellDef>משימות מובילות</th>
                  <td mat-cell *matCellDef="let r">
                    @if (r.topTasks?.length) {
                      <span class="names-list">{{ topTaskNames(r.topTasks) }}</span>
                    } @else { {{ r.totalTasks }} }
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="projectCols"></tr>
                <tr mat-row *matRowDef="let row; columns: projectCols;" class="table-row"></tr>
              </table>
              @if (!projectReport.length) { <div class="empty-state"><mat-icon>bar_chart</mat-icon><p>לא נמצאו נתונים</p></div> }
            </div>
          </mat-tab>

          <!-- ── Tab 3: By task ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">task_alt</mat-icon> לפי משימה
            </ng-template>
            <div class="filter-strip">
              <mat-form-field appearance="outline" class="ff">
                <mat-label>פרויקט</mat-label>
                <mat-select [(ngModel)]="filter.projectId">
                  <mat-option [value]="null">כל הפרויקטים</mat-option>
                  @for (p of projects; track p.projectId) {
                    <mat-option [value]="p.projectId">{{ p.projectName }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="ff-date">
                <mat-label>מתאריך</mat-label>
                <input matInput type="date" [(ngModel)]="filter.fromDate" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="ff-date">
                <mat-label>עד תאריך</mat-label>
                <input matInput type="date" [(ngModel)]="filter.toDate" />
              </mat-form-field>
              <div class="preset-btns">
                <button class="chip-sm" (click)="setPreset('today')">היום</button>
                <button class="chip-sm" (click)="setPreset('week')">שבוע זה</button>
                <button class="chip-sm" (click)="setPreset('month')">חודש זה</button>
              </div>
              <button class="btn-primary" (click)="loadReports()">
                <mat-icon>bar_chart</mat-icon> הפק דוח
              </button>
            </div>
            <div class="table-wrap">
              <table mat-table [dataSource]="taskReport" class="main-table">
                <ng-container matColumnDef="task">
                  <th mat-header-cell *matHeaderCellDef>משימה</th>
                  <td mat-cell *matCellDef="let r">
                    <div class="task-cell">
                      <strong>{{ r.taskName }}</strong>
                      @if (r.clickUpUrl) {
                        <a [href]="r.clickUpUrl" target="_blank" class="cu-link-icon" matTooltip="פתח ב-ClickUp ({{ r.clickUpTaskId }})">
                          <mat-icon>open_in_new</mat-icon>
                        </a>
                      }
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="project">
                  <th mat-header-cell *matHeaderCellDef>פרויקט</th>
                  <td mat-cell *matCellDef="let r"><span class="project-name">{{ r.projectName }}</span></td>
                </ng-container>
                <ng-container matColumnDef="employee">
                  <th mat-header-cell *matHeaderCellDef>עובד</th>
                  <td mat-cell *matCellDef="let r">{{ r.assignedUser || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="hours">
                  <th mat-header-cell *matHeaderCellDef>בפועל</th>
                  <td mat-cell *matCellDef="let r"><span class="duration-badge">{{ formatHours(r.totalHours) }}</span></td>
                </ng-container>
                <ng-container matColumnDef="planned">
                  <th mat-header-cell *matHeaderCellDef>מתוכנן</th>
                  <td mat-cell *matCellDef="let r">
                    @if (r.estimatedHours) {
                      <div class="planned-cell">
                        <span class="duration-badge planned">{{ formatHours(r.estimatedHours) }}</span>
                        <span class="variance" [class.over]="r.totalHours > r.estimatedHours" [class.under]="r.totalHours <= r.estimatedHours">
                          {{ r.totalHours > r.estimatedHours ? '+' : '' }}{{ formatHours(r.totalHours - r.estimatedHours) }}
                        </span>
                      </div>
                    } @else {
                      <span class="no-task">—</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="lastDate">
                  <th mat-header-cell *matHeaderCellDef>פעילות אחרונה</th>
                  <td mat-cell *matCellDef="let r">{{ r.lastWorkedOn | date:'d/M/yy' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="taskCols"></tr>
                <tr mat-row *matRowDef="let row; columns: taskCols;" class="table-row"></tr>
              </table>
              @if (!taskReport.length) { <div class="empty-state"><mat-icon>bar_chart</mat-icon><p>לא נמצאו נתונים</p></div> }
            </div>
          </mat-tab>

          <!-- ── Tab 4: Anomalies ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">warning</mat-icon> חריגות
            </ng-template>
            <div class="filter-strip">
              <mat-form-field appearance="outline" class="ff">
                <mat-label>עובד</mat-label>
                <mat-select [(ngModel)]="filter.userId">
                  <mat-option [value]="null">כל העובדים</mat-option>
                  @for (u of users; track u.userId) {
                    <mat-option [value]="u.userId">{{ u.fullName }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="ff-date">
                <mat-label>מתאריך</mat-label>
                <input matInput type="date" [(ngModel)]="filter.fromDate" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="ff-date">
                <mat-label>עד תאריך</mat-label>
                <input matInput type="date" [(ngModel)]="filter.toDate" />
              </mat-form-field>
              <div class="preset-btns">
                <button class="chip-sm" (click)="setPreset('today')">היום</button>
                <button class="chip-sm" (click)="setPreset('week')">שבוע זה</button>
                <button class="chip-sm" (click)="setPreset('month')">חודש זה</button>
              </div>
              <button class="btn-primary" (click)="loadReports()">
                <mat-icon>search</mat-icon> בדוק חריגות
              </button>
            </div>
            <div class="tab-content">
              @if (anomalies) {
                <div class="anomaly-section">
                  <div class="anomaly-title"><mat-icon>access_time</mat-icon> דיווחים ארוכים (מעל 10 שעות)</div>
                  @for (e of anomalies.longEntries; track e.timeEntryId) {
                    <div class="anomaly-row">{{ e.date | date:'d/M/yy' }} — {{ e.userName }} — {{ e.projectName }} — {{ formatMinutes(e.durationMinutes) }}</div>
                  }
                  @if (!anomalies.longEntries?.length) { <p class="ok-msg">✓ אין דיווחים ארוכים</p> }
                </div>
                <div class="anomaly-section">
                  <div class="anomaly-title"><mat-icon>event_busy</mat-icon> ימים ללא דיווח</div>
                  @if (filter.fromDate && filter.toDate) {
                    @for (m of anomalies.missingDays; track $index) {
                      <div class="anomaly-row">{{ m.fullName }} — {{ m.date | date:'d/M/yy (EEE)' }}</div>
                    }
                    @if (!anomalies.missingDays?.length) { <p class="ok-msg">✓ אין ימי עבודה ללא דיווח</p> }
                  } @else {
                    <p class="info-msg">בחר טווח תאריכים לבדיקת ימים חסרים</p>
                  }
                </div>
                <div class="anomaly-section">
                  <div class="anomaly-title"><mat-icon>warning</mat-icon> דיווחים חופפים</div>
                  @for (o of anomalies.overlaps; track $index) {
                    <div class="anomaly-row">
                      {{ o.entry1.userName }} — {{ o.entry1.date | date:'d/M/yy' }}:
                      {{ o.entry1.startTime }}–{{ o.entry1.endTime }} ({{ o.entry1.projectName }})
                      חופף עם {{ o.entry2.startTime }}–{{ o.entry2.endTime }} ({{ o.entry2.projectName }})
                    </div>
                  }
                  @if (!anomalies.overlaps?.length) { <p class="ok-msg">✓ לא נמצאו חפיפות</p> }
                </div>
              } @else {
                <div class="empty-state"><mat-icon>search</mat-icon><p>הפק דוח לבדיקת חריגות</p></div>
              }
            </div>
          </mat-tab>

        </mat-tab-group>
      </div>
    </div>

    <!-- Reject overlay panel -->
    @if (rejectingEntry) {
      <div class="reject-overlay">
        <div class="reject-panel">
          <div class="reject-panel-header">
            <mat-icon>cancel</mat-icon>
            <span>דחיית דיווח — {{ rejectingEntry.userName }}, {{ rejectingEntry.date | date:'d/M/yy' }}</span>
          </div>
          <div class="reject-panel-body">
            <label class="reject-label">סיבת הדחייה (אופציונלי)</label>
            <textarea class="reject-textarea" [(ngModel)]="rejectReason"
              rows="3" placeholder="הסבר לעובד מדוע הדיווח נדחה..."></textarea>
          </div>
          <div class="reject-panel-footer">
            <button class="btn-cancel-reject" (click)="cancelReject()">ביטול</button>
            <button class="btn-confirm-reject" (click)="confirmReject()">
              <mat-icon>send</mat-icon> אשר דחייה
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .page-header { margin-bottom: 24px; }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; color: #1e1b4b; }
    .header-sub { margin: 0; color: #6b7280; font-size: 14px; }

    .table-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(30,27,75,0.07); overflow: hidden; }

    /* Filter strip */
    .filter-strip {
      display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start;
      padding: 16px 20px; border-bottom: 1px solid #f3f4f6; background: #fafafe;
    }
    .ff      { min-width: 160px; max-width: 200px; }
    .ff-date { min-width: 140px; max-width: 170px; }

    .btn-primary {
      height: 56px; padding: 0 20px; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; font-size: 14px; font-weight: 600; font-family: 'Heebo', sans-serif;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-primary:hover { box-shadow: 0 4px 16px rgba(79,70,229,0.4); }
    .btn-clear {
      height: 56px; width: 48px; border: 1px solid #e5e7eb; border-radius: 10px;
      background: white; color: #9ca3af; cursor: pointer; display: flex;
      align-items: center; justify-content: center; transition: all 0.15s;
    }
    .btn-clear:hover { border-color: #4f46e5; color: #4f46e5; }

    /* Summary bar */
    .summary-bar {
      display: flex; gap: 12px; align-items: center;
      padding: 10px 20px; background: #f0f0fe; border-bottom: 1px solid #e0e0fc;
    }
    .summary-chip {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; color: #4f46e5; font-weight: 500;
    }
    .summary-chip mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .summary-chip.highlight { font-size: 14px; font-weight: 700; }

    /* Tab icon */
    .tab-icon { font-size: 16px; width: 16px; height: 16px; margin-left: 6px; vertical-align: middle; }

    /* Table */
    .table-wrap { overflow-x: auto; }
    .main-table { width: 100%; }
    .mat-mdc-header-row { background: #f9f8ff; position: sticky; top: 0; z-index: 1; }
    th.mat-mdc-header-cell { font-weight: 700; font-size: 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6; padding: 12px 14px; white-space: nowrap; }
    td.mat-mdc-cell { padding: 12px 14px; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
    .table-row:hover td { background: #fafafe; }
    .table-row:last-child td { border-bottom: none; }
    .desc-cell { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #6b7280; font-size: 13px; }

    /* Cell styles */
    .date-chip {
      background: #f3f4f6; color: #374151; font-size: 12px; font-weight: 600;
      padding: 3px 10px; border-radius: 20px; white-space: nowrap;
    }
    .user-cell { display: flex; align-items: center; gap: 8px; }
    .avatar {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .project-name { color: #1e1b4b; font-weight: 600; }
    .task-chip {
      display: inline-flex; align-items: center; gap: 4px;
      background: #ede9fe; color: #5b21b6;
      font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 500;
    }
    .cu-icon { font-size: 13px; width: 13px; height: 13px; }
    .no-task { color: #d1d5db; }
    .task-cell { display: flex; align-items: center; gap: 6px; }
    .cu-link-icon {
      display: inline-flex; align-items: center; color: #7b68ee; flex-shrink: 0;
      text-decoration: none;
    }
    .cu-link-icon:hover { color: #5b21b6; }
    .cu-link-icon mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .planned-cell { display: flex; align-items: center; gap: 6px; }
    .duration-badge.planned { background: #e0f2fe; color: #0369a1; }
    .variance { font-size: 11px; font-weight: 700; }
    .variance.over  { color: #dc2626; }
    .variance.under { color: #16a34a; }
    .duration-badge {
      background: #dbeafe; color: #1d4ed8;
      font-size: 12px; font-weight: 700; padding: 3px 12px; border-radius: 20px;
    }
    .badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .badge-draft      { background: #ede9fe; color: #5b21b6; }
    .badge-submitted  { background: #fef3c7; color: #92400e; }
    .badge-approved   { background: #d1fae5; color: #065f46; }
    .badge-rejected   { background: #fee2e2; color: #991b1b; }

    /* Empty state */
    .empty-state { text-align: center; padding: 64px; color: #9ca3af; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; display: block; margin: 0 auto 12px; opacity: 0.35; }
    .empty-state p { margin: 0; font-size: 14px; }

    /* Tab content padding */
    .tab-content { padding: 0 20px 20px; }

    /* Preset date buttons */
    .preset-btns { display: flex; gap: 5px; padding-top: 8px; }
    .chip-sm {
      height: 36px; padding: 0 12px; border: 1.5px solid #e5e7eb; border-radius: 20px;
      background: white; color: #6b7280; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .chip-sm:hover { border-color: #4f46e5; color: #4f46e5; background: #ede9fe; }

    /* Names list */
    .names-list { font-size: 13px; color: #374151; }

    /* Info message */
    .info-msg { color: #6b7280; background: #f9fafb; padding: 10px 16px; border-radius: 8px; font-size: 13px; margin: 0; }

    /* Anomalies */
    .anomaly-section { padding: 20px 20px; border-bottom: 1px solid #f3f4f6; }
    .anomaly-section:last-child { border-bottom: none; }
    .anomaly-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; color: #1e1b4b; margin-bottom: 12px; }
    .anomaly-title mat-icon { color: #f59e0b; }
    .anomaly-row { padding: 8px 12px; background: #fff7ed; border-radius: 8px; font-size: 13px; color: #92400e; margin-bottom: 6px; }
    .ok-msg { color: #065f46; background: #d1fae5; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; margin: 0; }

    /* Approval actions */
    .approval-actions { display: flex; gap: 6px; align-items: center; }
    .btn-approve {
      display: inline-flex; align-items: center; gap: 4px;
      height: 30px; padding: 0 10px; border: none; border-radius: 8px;
      background: #d1fae5; color: #065f46; font-size: 12px; font-weight: 700;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .btn-approve:hover { background: #a7f3d0; }
    .btn-approve mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .btn-reject-entry {
      display: inline-flex; align-items: center; gap: 4px;
      height: 30px; padding: 0 10px; border: none; border-radius: 8px;
      background: #fee2e2; color: #991b1b; font-size: 12px; font-weight: 700;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .btn-reject-entry:hover { background: #fecaca; }
    .btn-reject-entry mat-icon { font-size: 15px; width: 15px; height: 15px; }

    .rejection-hint {
      display: inline-flex; align-items: center; margin-right: 6px; color: #dc2626; cursor: help;
    }
    .rejection-hint mat-icon { font-size: 15px; width: 15px; height: 15px; }

    /* Reject overlay */
    .reject-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .reject-panel {
      background: white; border-radius: 16px; width: 440px; max-width: 95vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25); overflow: hidden;
    }
    .reject-panel-header {
      display: flex; align-items: center; gap: 10px;
      padding: 18px 20px; background: #fef2f2;
      font-weight: 700; font-size: 14px; color: #991b1b;
      border-bottom: 1px solid #fecaca;
    }
    .reject-panel-header mat-icon { color: #dc2626; }
    .reject-panel-body { padding: 18px 20px; }
    .reject-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
    .reject-textarea {
      width: 100%; border: 1px solid #d1d5db; border-radius: 8px;
      padding: 10px 12px; font-size: 14px; font-family: 'Heebo', sans-serif;
      resize: none; box-sizing: border-box;
    }
    .reject-textarea:focus { outline: none; border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
    .reject-panel-footer {
      display: flex; gap: 10px; justify-content: flex-end;
      padding: 14px 20px; border-top: 1px solid #f3f4f6;
    }
    .btn-cancel-reject {
      height: 38px; padding: 0 16px; border: 1px solid #d1d5db; border-radius: 8px;
      background: white; color: #374151; font-size: 13px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer;
    }
    .btn-confirm-reject {
      display: inline-flex; align-items: center; gap: 6px;
      height: 38px; padding: 0 20px; border: none; border-radius: 8px;
      background: linear-gradient(135deg, #dc2626, #ef4444);
      color: white; font-size: 13px; font-weight: 700;
      font-family: 'Heebo', sans-serif; cursor: pointer;
    }
    .btn-confirm-reject mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `]
})
export class ReportsComponent implements OnInit {
  projects: Project[] = [];
  users: any[] = [];
  entryTasks: Task[] = [];

  // Tab 0 — entries
  ef: any = { userId: null, projectId: null, taskId: null, status: null, fromDate: '', toDate: '' };
  entryResult: { entries: any[]; totalHours: number; totalCount: number } = { entries: [], totalHours: 0, totalCount: 0 };
  entriesLoaded = false;
  rejectingEntry: any = null;
  rejectReason = '';

  // Tabs 1-4 — summary reports
  filter: any = {};
  userReport: any[] = [];
  projectReport: any[] = [];
  taskReport: any[] = [];
  anomalies: any = null;
  reportsLoaded = false;

  entryCols = ['date', 'employee', 'project', 'task', 'duration', 'description', 'status', 'approval'];
  userCols    = ['name', 'hours', 'entries', 'projects'];
  projectCols = ['name', 'hours', 'workers', 'tasks'];
  taskCols    = ['task', 'project', 'employee', 'hours', 'planned', 'lastDate'];

  constructor(
    private reportService: ReportService,
    private projectService: ProjectService,
    private taskService: TaskService,
    private timeEntryService: TimeEntryService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.projectService.getAll().subscribe(p => this.projects = p);
    this.http.get<any[]>(`${environment.apiUrl}/users`).subscribe(u => this.users = u);
    this.loadEntries();
  }

  onTabChange(index: number) {
    Promise.resolve().then(() => {
      if (index === 0 && !this.entriesLoaded) this.loadEntries();
      else if (index >= 1 && !this.reportsLoaded) this.loadReports();
      this.cdr.markForCheck();
    });
  }

  // ── Entries tab ──────────────────────────────

  onEntryProjectChange() {
    this.ef.taskId = null;
    this.entryTasks = [];
    if (this.ef.projectId)
      this.taskService.getAll(this.ef.projectId).subscribe(t => this.entryTasks = t);
    this.onEntryFilterChange();
  }

  onEntryFilterChange() { this.loadEntries(); }

  clearEntryFilters() {
    this.ef = { userId: null, projectId: null, taskId: null, status: null, fromDate: '', toDate: '' };
    this.entryTasks = [];
    this.loadEntries();
  }

  approveEntry(entry: any) {
    this.timeEntryService.approve(entry.timeEntryId).subscribe({
      next: () => { this.loadEntries(); this.snackBar.open('הדיווח אושר', 'סגור', { duration: 2000 }); },
      error: () => this.snackBar.open('שגיאה באישור הדיווח', 'סגור', { duration: 3000 })
    });
  }

  openRejectPanel(entry: any) {
    this.rejectingEntry = entry;
    this.rejectReason = '';
  }

  confirmReject() {
    if (!this.rejectingEntry) return;
    this.timeEntryService.reject(this.rejectingEntry.timeEntryId, this.rejectReason || undefined).subscribe({
      next: () => {
        this.rejectingEntry = null;
        this.rejectReason = '';
        this.loadEntries();
        this.snackBar.open('הדיווח נדחה', 'סגור', { duration: 2000 });
      },
      error: () => this.snackBar.open('שגיאה בדחיית הדיווח', 'סגור', { duration: 3000 })
    });
  }

  cancelReject() {
    this.rejectingEntry = null;
    this.rejectReason = '';
  }

  loadEntries() {
    const f: any = {};
    if (this.ef.userId)    f.userId    = this.ef.userId;
    if (this.ef.projectId) f.projectId = this.ef.projectId;
    if (this.ef.taskId)    f.taskId    = this.ef.taskId;
    if (this.ef.status)    f.status    = this.ef.status;
    if (this.ef.fromDate)  f.fromDate  = this.ef.fromDate;
    if (this.ef.toDate)    f.toDate    = this.ef.toDate;

    this.reportService.getEntriesReport(f).subscribe({
      next: r => { this.entryResult = r; this.entriesLoaded = true; },
      error: () => { this.entriesLoaded = true; this.snackBar.open('שגיאה בטעינת הדיווחים', 'סגור', { duration: 4000 }); }
    });
  }

  // ── Summary tabs ─────────────────────────────

  loadReports() {
    this.reportsLoaded = true;
    const f = { ...this.filter };
    this.reportService.getUserReport(f).subscribe({
      next: r => this.userReport = r,
      error: () => this.snackBar.open('שגיאה בטעינת דוח עובדים', 'סגור', { duration: 4000 })
    });
    this.reportService.getProjectReport(f).subscribe({
      next: r => this.projectReport = r,
      error: () => this.snackBar.open('שגיאה בטעינת דוח פרויקטים', 'סגור', { duration: 4000 })
    });
    this.reportService.getTaskReport(f).subscribe({
      next: r => this.taskReport = r,
      error: () => this.snackBar.open('שגיאה בטעינת דוח משימות', 'סגור', { duration: 4000 })
    });
    this.reportService.getAnomalies(f).subscribe({
      next: r => this.anomalies = r,
      error: () => this.snackBar.open('שגיאה בטעינת דוח חריגות', 'סגור', { duration: 4000 })
    });
  }

  // ── Helpers ──────────────────────────────────

  initials(name: string): string {
    return (name ?? '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  formatHours(h: number): string {
    if (!h) return '0:00';
    const hrs = Math.floor(h);
    const min = Math.round((h - hrs) * 60);
    return `${hrs}:${String(min).padStart(2, '0')}`;
  }

  formatMinutes(m: number): string {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}:${String(min).padStart(2, '0')}`;
  }

  statusLabel(s: string): string {
    const map: any = { Draft: 'טיוטה', Submitted: 'הוגש', Approved: 'אושר', Rejected: 'נדחה' };
    return map[s] ?? s;
  }

  topTaskNames(tasks: any[]): string {
    return tasks.map(t => t.taskName).join(', ');
  }

  setPreset(type: 'today' | 'week' | 'month') {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (type === 'today') {
      this.filter.fromDate = fmt(today);
      this.filter.toDate = fmt(today);
    } else if (type === 'week') {
      const sun = new Date(today);
      sun.setDate(today.getDate() - today.getDay());
      this.filter.fromDate = fmt(sun);
      this.filter.toDate = fmt(today);
    } else {
      this.filter.fromDate = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
      this.filter.toDate = fmt(today);
    }
  }

  setEntryPreset(type: 'today' | 'week' | 'month') {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (type === 'today') {
      this.ef.fromDate = fmt(today);
      this.ef.toDate = fmt(today);
    } else if (type === 'week') {
      const sun = new Date(today);
      sun.setDate(today.getDate() - today.getDay());
      this.ef.fromDate = fmt(sun);
      this.ef.toDate = fmt(today);
    } else {
      this.ef.fromDate = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
      this.ef.toDate = fmt(today);
    }
    this.loadEntries();
  }
}
