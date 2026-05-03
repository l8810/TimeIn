import { Component, Inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule],
  template: `
    <div class="dlg">
      <div class="dlg-head">
        <div class="dlg-icon"><mat-icon>delete_forever</mat-icon></div>
        <div class="dlg-title">{{ data.title }}</div>
      </div>
      <div class="dlg-body">{{ data.message }}</div>
      <div class="dlg-foot">
        <button class="btn-cancel" (click)="ref.close(false)">ביטול</button>
        <button class="btn-confirm" (click)="ref.close(true)">
          <mat-icon>delete</mat-icon>{{ data.confirmText ?? 'מחק' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg { border-radius: 16px; overflow: hidden; min-width: 340px; }

    .dlg-head {
      display: flex; flex-direction: column; align-items: center;
      padding: 28px 24px 14px; background: #fef2f2; text-align: center;
    }
    .dlg-icon {
      width: 58px; height: 58px; border-radius: 50%;
      background: #fee2e2; display: flex; align-items: center; justify-content: center;
      margin-bottom: 12px;
    }
    .dlg-icon mat-icon { color: #dc2626; font-size: 28px; width: 28px; height: 28px; }
    .dlg-title { font-size: 18px; font-weight: 700; color: #991b1b; }

    .dlg-body {
      padding: 18px 28px; text-align: center;
      font-size: 14px; color: #374151; line-height: 1.6;
    }

    .dlg-foot {
      display: flex; gap: 10px; justify-content: center;
      padding: 4px 24px 24px;
    }
    .btn-cancel {
      height: 40px; padding: 0 24px; border: 1.5px solid #d1d5db; border-radius: 10px;
      background: white; color: #374151; font-size: 14px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .btn-cancel:hover { border-color: #9ca3af; background: #f9fafb; }
    .btn-confirm {
      height: 40px; padding: 0 20px; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #dc2626, #ef4444);
      color: white; font-size: 14px; font-weight: 700;
      font-family: 'Heebo', sans-serif; cursor: pointer;
      display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-confirm:hover { box-shadow: 0 4px 14px rgba(220,38,38,0.4); transform: translateY(-1px); }
    .btn-confirm mat-icon { font-size: 17px; width: 17px; height: 17px; }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public ref: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
