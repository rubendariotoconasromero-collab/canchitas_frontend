import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, finalize } from 'rxjs';

import { API_ENDPOINTS } from '../constants/api-endpoints';
import { AuthResponse, Usuario } from '../models/auth.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  readonly user = signal<Usuario | null>(this.storage.getUser());

  can(permission: string, global = false): boolean {
    const user = this.user();
    return !!user?.estado && !!user.permisos_efectivos?.includes(permission)
      && (!global || !!user.alcance_global);
  }

  clearSession(): void {
    this.storage.clear();
    this.user.set(null);
  }

  private updateUser(user: Usuario): void {
    const token = this.storage.getToken();
    if (token) this.storage.setSession(token, user);
    this.user.set(user);
  }

  login(correo: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.login, { correo, password }).pipe(
      tap((response) => {
        this.storage.setSession(response.token, response.user);
        this.updateUser(response.user);
      }),
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API_ENDPOINTS.logout, {}).pipe(
      finalize(() => this.clearSession()),
    );
  }

  me(): Observable<{ user: Usuario }> {
    return this.http.get<{ user: Usuario }>(API_ENDPOINTS.me).pipe(
      tap(response => this.updateUser(response.user)),
    );
  }

  isAuthenticated(): boolean {
    return !!this.storage.getToken();
  }

  currentUser(): Usuario | null {
    return this.user();
  }
}
