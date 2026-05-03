import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GitService, GitCommit } from '../../services/git.service';

@Component({
  selector: 'app-commits-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, MatSnackBarModule],
  template: `
    <div class="panel">
      <div class="panel-header" (click)="expanded = !expanded">
        <div class="panel-title">
          <mat-icon>commit</mat-icon>
          <span>הCommits שלי</span>
          @if (commits.length) {
            <span class="count-badge">{{ commits.length }}</span>
          }
        </div>
        <div class="panel-controls">
          <div class="date-range" (click)="$event.stopPropagation()">
            <input type="date" class="date-input" [(ngModel)]="fromDate" (change)="load()" />
            <span>—</span>
            <input type="date" class="date-input" [(ngModel)]="toDate" (change)="load()" />
          </div>
          <mat-icon class="chevron" [class.rotated]="expanded">expand_more</mat-icon>
        </div>
      </div>

      @if (expanded) {
        <div class="panel-body">
          @if (loading) {
            <div class="loading-row">
              <div class="spinner"></div> טוען commits...
            </div>
          } @else if (!commits.length) {
            <div class="empty-row">
              <mat-icon>code_off</mat-icon>
              <span>לא נמצאו commits בטווח זה</span>
            </div>
          } @else {
            @for (c of commits; track c.hash) {
              <div class="commit-row" [class.linked]="c.linkedTimeEntryId || c.linkedTaskId">
                <div class="commit-main">
                  <a [href]="c.url" target="_blank" class="hash-chip">{{ c.shortHash }}</a>
                  <div class="commit-content">
                    <div class="commit-msg">{{ c.message }}</div>
                    <div class="commit-meta">
                      <mat-icon>person</mat-icon> {{ c.authorName }}
                      <mat-icon>schedule</mat-icon> {{ c.date | date:'dd/MM HH:mm' }}
                      @if (c.matchedTaskId) {
                        <span class="task-hint" matTooltip="זוהה מזהה משימה">
                          <mat-icon>task_alt</mat-icon> {{ c.matchedTaskId }}
                        </span>
                      }
                    </div>
                  </div>
                </div>
                <div class="commit-actions">
                  @if (c.linkedTimeEntryId || c.linkedTaskId) {
                    <span class="linked-badge">
                      <mat-icon>link</mat-icon>
                      {{ c.linkedTaskName ?? 'דיווח #' + c.linkedTimeEntryId }}
                    </span>
                    <button class="btn-unlink" (click)="unlink(c)" matTooltip="הסר קישור">
                      <mat-icon>link_off</mat-icon>
                    </button>
                  } @else {
                    <button class="btn-link" (click)="link(c)">
                      <mat-icon>add_link</mat-icon> שייך
                    </button>
                  }
                </div>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .panel {
      background: white; border-radius: 16px; margin-top: 20px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 2px 8px rgba(30,27,75,0.05);
      overflow: hidden;
    }
    .panel-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; cursor: pointer; user-select: none;
      border-bottom: 1px solid transparent; transition: background 0.15s;
    }
    .panel-header:hover { background: #fafafe; }
    .panel-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 700; color: #1e1b4b;
    }
    .panel-title mat-icon { color: #4f46e5; font-size: 20px; width: 20px; height: 20px; }
    .count-badge {
      background: #ede9fe; color: #5b21b6;
      font-size: 12px; font-weight: 700;
      padding: 1px 8px; border-radius: 10px;
    }
    .panel-controls { display: flex; align-items: center; gap: 12px; }
    .date-range { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; }
    .date-input {
      height: 28px; padding: 0 8px; border: 1px solid #e5e7eb; border-radius: 6px;
      font-size: 12px; font-family: 'Heebo', sans-serif; color: #374151;
      background: white; cursor: pointer;
    }
    .chevron { color: #9ca3af; transition: transform 0.2s; }
    .chevron.rotated { transform: rotate(180deg); }

    .panel-body { padding: 4px 0; }

    .loading-row, .empty-row {
      display: flex; align-items: center; gap: 10px; justify-content: center;
      padding: 24px; color: #9ca3af; font-size: 13px;
    }
    .empty-row mat-icon { font-size: 20px; width: 20px; height: 20px; opacity: 0.5; }
    .spinner {
      width: 18px; height: 18px; border: 2px solid #e5e7eb;
      border-top-color: #4f46e5; border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    .commit-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; border-bottom: 1px solid #f9fafb;
      transition: background 0.15s;
    }
    .commit-row:last-child { border-bottom: none; }
    .commit-row:hover { background: #fafafe; }
    .commit-row.linked { background: #f0fdf4; }
    .commit-row.linked:hover { background: #dcfce7; }

    .commit-main { display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0; }
    .hash-chip {
      display: inline-block; background: #1e1b4b; color: #a5b4fc;
      font-family: monospace; font-size: 11px; font-weight: 600;
      padding: 3px 8px; border-radius: 6px; text-decoration: none;
      flex-shrink: 0; transition: background 0.15s;
    }
    .hash-chip:hover { background: #312e81; }
    .commit-content { flex: 1; min-width: 0; }
    .commit-msg {
      font-size: 13px; font-weight: 600; color: #1e1b4b;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .commit-meta {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: #9ca3af; margin-top: 3px;
    }
    .commit-meta mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .task-hint {
      display: inline-flex; align-items: center; gap: 3px;
      background: #ede9fe; color: #5b21b6; padding: 1px 6px; border-radius: 4px;
      font-size: 11px; font-weight: 600;
    }
    .task-hint mat-icon { font-size: 11px; width: 11px; height: 11px; }

    .commit-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-right: 16px; }
    .linked-badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: #d1fae5; color: #065f46;
      font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 6px;
      max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .linked-badge mat-icon { font-size: 13px; width: 13px; height: 13px; flex-shrink: 0; }
    .btn-link {
      display: inline-flex; align-items: center; gap: 4px;
      height: 30px; padding: 0 12px; border: 1.5px dashed #818cf8;
      border-radius: 8px; background: transparent; color: #4f46e5;
      font-size: 12px; font-weight: 600; font-family: 'Heebo', sans-serif;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-link mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .btn-link:hover { background: #ede9fe; border-color: #4f46e5; }
    .btn-unlink {
      width: 28px; height: 28px; border: none; border-radius: 6px;
      background: transparent; cursor: pointer; display: flex;
      align-items: center; justify-content: center; color: #9ca3af;
      transition: all 0.15s;
    }
    .btn-unlink mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-unlink:hover { background: #fee2e2; color: #ef4444; }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class CommitsPanelComponent implements OnInit {
  @Input() userId?: number;

  commits: GitCommit[] = [];
  loading = false;
  expanded = true;
  fromDate: string;
  toDate: string;

  constructor(
    private gitService: GitService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);
    this.toDate = today.toISOString().split('T')[0];
    this.fromDate = monthAgo.toISOString().split('T')[0];
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.gitService.getCommits(
      new Date(this.fromDate),
      new Date(this.toDate),
      this.userId
    ).subscribe({
      next: c => {
        Promise.resolve().then(() => {
          this.commits = c;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        Promise.resolve().then(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  link(commit: GitCommit) {
    this.gitService.linkCommit({
      commitHash: commit.hash,
      commitMessage: commit.message,
      authorName: commit.authorName,
      authorEmail: commit.authorEmail,
      commitDate: commit.date,
      taskId: commit.matchedTaskId ? undefined : undefined
    }).subscribe({
      next: updated => {
        const idx = this.commits.findIndex(c => c.hash === commit.hash);
        if (idx >= 0) this.commits[idx] = { ...this.commits[idx], ...updated };
        this.snackBar.open('Commit שויך בהצלחה', 'סגור', { duration: 2000 });
        this.cdr.detectChanges();
      },
      error: () => this.snackBar.open('שגיאה בשיוך', 'סגור', { duration: 3000 })
    });
  }

  unlink(commit: GitCommit) {
    this.gitService.unlinkCommit(commit.hash).subscribe({
      next: () => {
        const idx = this.commits.findIndex(c => c.hash === commit.hash);
        if (idx >= 0) {
          this.commits[idx] = {
            ...this.commits[idx],
            linkedTimeEntryId: undefined,
            linkedTaskId: undefined,
            linkedTaskName: undefined
          };
        }
        this.snackBar.open('הקישור הוסר', 'סגור', { duration: 2000 });
        this.cdr.detectChanges();
      },
      error: () => this.snackBar.open('שגיאה', 'סגור', { duration: 3000 })
    });
  }
}
