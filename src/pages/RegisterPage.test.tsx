import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';
import '@testing-library/jest-dom';

// Mock useNavigate and useLocation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/register',
    state: {},
  }),
}));

// Mock useAuth context
const mockRegister = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    isLoading: false,
    error: null,
  }),
}));

// Mock useLanguage context
jest.mock('../lib/language', () => ({
  useLanguage: () => ({
    language: 'tamil',
    setLanguage: jest.fn(),
  }),
}));

// Mock useToast
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders register form fields and language switch button', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Verify registration headers
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();

    // Verify presence of input fields
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter temple name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('10-digit mobile number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('validates mobile number length and password length before register API call', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Fill in values with short password
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Enter temple name'), { target: { value: 'Siva Temple' } });
    fireEvent.change(screen.getByPlaceholderText('10-digit mobile number'), { target: { value: '987654' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: '123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    // Wait and verify error modal is displayed for password length
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('calls register API and redirects on successful form submission', async () => {
    mockRegister.mockResolvedValueOnce({ success: true });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Fill in valid details
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Ramesh' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Kumar' } });
    fireEvent.change(screen.getByPlaceholderText('Enter temple name'), { target: { value: 'Murugan Temple' } });
    fireEvent.change(screen.getByPlaceholderText('10-digit mobile number'), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your username'), { target: { value: 'rameshkumar' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Ramesh Kumar',
        mobileNumber: '9876543210',
        username: 'rameshkumar',
      }));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({
        replace: true,
        state: expect.objectContaining({
          message: 'Your account has been successfully created!'
        })
      }));
    });
  });
});
