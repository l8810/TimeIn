import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReportingRulesService } from '../../services/reporting-rules.service';
import { ReportingRules, UpdateReportingRulesRequest } from '../../models/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatIconModule,
    MatSlideToggleModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>הגדרות מערכת</h1>
          <p class="header-sub">ניהול חוקים לדיווח שעות עבודה</p>
        </div>
      </div>

      @if (loading) {
        <div class="loading">
          <mat-progress-spinner diameter="48" mode="indeterminate"></mat-progress-spinner>
          <p>טוען הגדרות...</p>
        </div>
      }

      @if (!loading && form) {
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <mat-icon>rule</mat-icon>
              <span>חוקי דיווח שעות</span>
            </div>
            @if (rules?.updatedAt) {
              <span class="last-update">
                @if (rules?.updatedByUserName) { עודכן על ידי {{ rules?.updatedByUserName }} · }
                {{ rules?.updatedAt | date:'dd/MM/yyyy HH:mm' }}
              </span>
            }
          </div>

          <div class="card-body">
            <form [formGroup]="form">

              <div class="toggle-group">
                <div class="toggle-label">
                  <mat-icon>task_alt</mat-icon>
                  <div>
                    <div class="toggle-title">חובה לבחור משימה</div>
                    <div class="toggle-sub">האם חייבים להקצות דיווח לכל משימה?</div>
                  </div>
                </div>
                <mat-slide-toggle formControlName="isTaskMandatory"></mat-slide-toggle>
              </div>

              <div class="field-row">
                <mat-form-field appearance="outline" class="field">
                  <mat-label>מס' שעות מקסימלי ביום</mat-label>
                  <input matInput type="number" formControlName="maxHoursPerDay" min="1" max="24" step="0.5">
                  <mat-hint>בין 1 ל-24 שעות</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline" class="field">
                  <mat-label>ימים לדיווח רטרואקטיבי</mat-label>
                  <input matInput type="number" formControlName="retroactiveDaysAllowed" min="0" max="365" step="1">
                  <mat-hint>0 = רק היום, 7 = שבוע לאחור</mat-hint>
                </mat-form-field>
              </div>

              <div class="form-actions">
                <button class="btn-reset" type="button" (click)="reset()">
                  <mat-icon>restart_alt</mat-icon> אפס שינויים
                </button>
                <button class="btn-save" type="button" (click)="save()" [disabled]="!form.dirty || saving">
                  @if (saving) {
                    <mat-progress-spinner diameter="18" mode="indeterminate"></mat-progress-spinner>
                  } @else {
                    <mat-icon>save</mat-icon>
                  }
                  שמור הגדרות
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="card info-card">
          <div class="card-header">
            <div class="card-title">
              <mat-icon>help_outline</mat-icon>
              <span>הסבר על החוקים</span>
            </div>
          </div>
          <div class="card-body">
            <div class="info-item">
              <h4>חובה לבחור משימה</h4>
              <p>כאשר מופעל, כל דיווח שעות חייב להיות קשור למשימה ספציפית.</p>
            </div>
            <div class="info-item">
              <h4>מס' שעות מקסימלי ביום</h4>
              <p>למניעת שגיאות, המערכת לא תאפשר דיווח של יותר מהמספר הנקוב ביום אחד.</p>
            </div>
            <div class="info-item">
              <h4>ימים לדיווח רטרואקטיבי</h4>
              <p>קובע כמה ימים לאחור אפשר לדווח שעות. למשל, 7 = שבוע אחורה.</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: 32px 24px; }
    .page-header { margin-bottom: 28px; }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; color: #1e1b4b; }
    .header-sub { margin: 0; color: #6b7280; font-size: 14px; }

    .loading { display: flex; flex-direction: column; align-items: center; padding: 60px; color: #9ca3af; }
    .loading p { margin-top: 16px; font-size: 14px; }

    .card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(30,27,75,0.07); margin-bottom: 24px; overflow: hidden; }
    .card-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid #f3f4f6; background: linear-gradient(135deg,#eef2ff,#faf5ff); }
    .card-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #1e1b4b; }
    .card-title mat-icon { color: #4f46e5; font-size: 20px; width: 20px; height: 20px; }
    .last-update { font-size: 12px; color: #9ca3af; }
    .card-body { padding: 28px 24px; }

    .info-card .card-header { background: linear-gradient(135deg,#dbeafe,#ede9fe); }
    .info-card .card-title { color: #1e40af; }
    .info-card .card-title mat-icon { color: #0284c7; }

    .toggle-group { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; background: #f9fafb; border-radius: 12px; margin-bottom: 24px; }
    .toggle-label { display: flex; align-items: center; gap: 14px; }
    .toggle-label mat-icon { font-size: 24px; width: 24px; height: 24px; color: #4f46e5; }
    .toggle-title { font-size: 15px; font-weight: 600; color: #1e1b4b; margin-bottom: 2px; }
    .toggle-sub { font-size: 13px; color: #9ca3af; }

    .field-row { display: flex; gap: 16px; margin-bottom: 8px; }
    .field { flex: 1; }

    .form-actions { display: flex; gap: 12px; justify-content: flex-end; padding-top: 24px; border-top: 1px solid #f3f4f6; margin-top: 24px; }
    .btn-reset { display: flex; align-items: center; gap: 6px; height: 40px; padding: 0 18px; border: 1px solid #d1d5db; border-radius: 10px; background: white; color: #374151; font-size: 14px; font-weight: 600; font-family: 'Heebo',sans-serif; cursor: pointer; }
    .btn-reset:hover { background: #f9fafb; }
    .btn-save { display: flex; align-items: center; gap: 6px; height: 40px; padding: 0 20px; border: none; border-radius: 10px; background: linear-gradient(135deg,#4f46e5,#7c3aed); color: white; font-size: 14px; font-weight: 600; font-family: 'Heebo',sans-serif; cursor: pointer; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-save mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .info-item { margin-bottom: 20px; }
    .info-item:last-child { margin-bottom: 0; }
    .info-item h4 { margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #1e1b4b; }
    .info-item p { margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6; }
  `]
})
export class SettingsComponent implements OnInit {
  form: FormGroup | null = null;
  rules: ReportingRules | null = null;
  loading = true;
  saving = false;
  originalRules: ReportingRules | null = null;

  constructor(
    private fb: FormBuilder,
    private rulesService: ReportingRulesService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading = true;
    this.rulesService.get().subscribe({
      next: (rules) => {
        this.rules = rules;
        this.originalRules = { ...rules };
        this.initForm(rules);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('שגיאה בטעינת ההגדרות', 'סגור', { duration: 3000 });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private initForm(rules: ReportingRules) {
    this.form = this.fb.group({
      isTaskMandatory: [rules.isTaskMandatory, Validators.required],
      maxHoursPerDay: [rules.maxHoursPerDay, [Validators.required, Validators.min(1), Validators.max(24)]],
      retroactiveDaysAllowed: [rules.retroactiveDaysAllowed, [Validators.required, Validators.min(0), Validators.max(365)]]
    });
  }

  onTaskMandatoryChange() {
    // Can add additional logic here if needed
  }

  reset() {
    if (this.originalRules && this.form) {
      this.initForm(this.originalRules);
      this.snackBar.open('ההגדרות אופסו', 'סגור', { duration: 2000 });
    }
  }

  save() {
    if (!this.form || !this.form.valid) {
      this.snackBar.open('בדוק את ההגדרות - יש שגיאות', 'סגור', { duration: 3000 });
      return;
    }

    this.saving = true;
    const req: UpdateReportingRulesRequest = this.form.value;

    this.rulesService.update(req).subscribe({
      next: (updated) => {
        this.rules = updated;
        this.originalRules = { ...updated };
        this.form!.markAsPristine();
        this.saving = false;
        this.snackBar.open('ההגדרות נשמרו בהצלחה ✓', 'סגור', { duration: 3000 });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('שגיאה בשמירת ההגדרות', 'סגור', { duration: 3000 });
      }
    });
  }
}
