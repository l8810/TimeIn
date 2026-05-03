import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  inject(Router).navigate(['/login']);
  return false;
};

export const managerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.hasRole('Manager', 'Admin')) return true;
  inject(Router).navigate(['/dashboard']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.hasRole('Admin')) return true;
  inject(Router).navigate(['/dashboard']);
  return false;
};
