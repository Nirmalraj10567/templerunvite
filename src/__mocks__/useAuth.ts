export const useAuth = () => ({
  token: 'test-token',
  user: { id: 1, name: 'Test User', email: 'test@example.com' },
  login: jest.fn(),
  logout: jest.fn(),
  isAuthenticated: true,
  loading: false,
});
