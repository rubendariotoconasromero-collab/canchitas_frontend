import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { API_ENDPOINTS } from '../constants/api-endpoints';
import { AuthResponse, Usuario } from '../models/auth.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);

  login(correo: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.login, { correo, password }).pipe(
      tap((response) => this.storage.setSession(response.token, response.user)),
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API_ENDPOINTS.logout, {}).pipe(
      tap(() => this.storage.clear()),
    );
  }

  me(): Observable<{ user: Usuario }> {
    return this.http.get<{ user: Usuario }>(API_ENDPOINTS.me);
  }

  isAuthenticated(): boolean {
    return !!this.storage.getToken();
  }

  currentUser(): Usuario | null {
    return this.storage.getUser();
  }
}
