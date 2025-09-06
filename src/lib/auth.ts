export function getAuthToken(): string {
  // Get token from localStorage or your auth context
  return localStorage.getItem('authToken') || '';
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function setAuthToken(token: string): void {
  localStorage.setItem('authToken', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('authToken');
}
