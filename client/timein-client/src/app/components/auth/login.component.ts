import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="login-bg">
      <div class="login-card">
        <div class="logo-area">
          <div class="logo-circle">
            <mat-icon>schedule</mat-icon>
          </div>
          <h1 class="brand">TimeIn</h1>
          <p class="subtitle">מערכת דיווח שעות עבודה</p>
        </div>

        <form (ngSubmit)="onLogin()" #loginForm="ngForm" class="login-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>אימייל</mat-label>
            <mat-icon matPrefix>email</mat-icon>
            <input matInput type="email" [(ngModel)]="email" name="email" required />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>סיסמה</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput [type]="showPass ? 'text' : 'password'"
              [(ngModel)]="password" name="password" required />
            <button type="button" mat-icon-button matSuffix (click)="showPass = !showPass">
              <mat-icon>{{ showPass ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          @if (error) {
            <div class="error-box">
              <mat-icon>error_outline</mat-icon>
              <span>{{ error }}</span>
            </div>
          }

          <button mat-flat-button class="login-btn" type="submit" [disabled]="loading">
            @if (loading) {
              <mat-spinner diameter="20" color="accent"></mat-spinner>
            } @else {
              <mat-icon>login</mat-icon>
              כניסה למערכת
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-bg {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%);
      padding: 24px;
    }
    .login-card {
      background: white;
      border-radius: 24px;
      padding: 48px 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 25px 60px rgba(79, 70, 229, 0.35);
    }
    .logo-area {
      text-align: center;
      margin-bottom: 36px;
    }
    .logo-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);
    }
    .logo-circle mat-icon {
      color: white;
      font-size: 36px;
      width: 36px;
      height: 36px;
    }
    .brand {
      font-size: 32px;
      font-weight: 800;
      color: #4f46e5;
      margin: 0 0 6px;
      letter-spacing: -1px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
      margin: 0;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .full-width { width: 100%; }
    .error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .error-box mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .login-btn {
      height: 52px;
      font-size: 16px;
      font-weight: 600;
      background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
      color: white !important;
      border-radius: 12px !important;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
    }
    .login-btn:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
      transform: translateY(-1px);
      transition: all 0.2s;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';
  showPass = false;

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    this.loading = true;
    this.error = '';
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.error = 'אימייל או סיסמה שגויים';
        this.loading = false;
      }
    });
  }
}
