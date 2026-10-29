import { Injectable } from '@angular/core';

import { Usuario } from '../models/auth.model';

const TOKEN_KEY = 'canchitas_token';
const USER_KEY = 'canchitas_user';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  setSession(token: string, user: Usuario): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getUser(): Usuario | null {
    const raw = sessionStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) as Usuario : null;
    } catch {
      this.clear();
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
}
