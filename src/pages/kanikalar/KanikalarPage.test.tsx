import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KanikalarPage from './KanikalarPage';
import '@testing-library/jest-dom';

// Mock the API calls
jest.mock('../../api', () => ({
  get: jest.fn(() => Promise.resolve({ data: [] })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
}));

describe('KanikalarPage', () => {
  const mockWeddings = [
    {
      id: 1,
      bride_name: 'Bride 1',
      groom_name: 'Groom 1',
      wedding_date: '2025-12-31',
      venue: 'Venue 1',
      contact_number: '1234567890',
      email: 'test1@example.com'
    },
    {
      id: 2,
      bride_name: 'Bride 2',
      groom_name: 'Groom 2',
      wedding_date: '2025-11-30',
      venue: 'Venue 2',
      contact_number: '0987654321',
      email: 'test2@example.com'
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders the page with empty state', async () => {
    render(
      <MemoryRouter>
        <KanikalarPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Kanikalar')).toBeInTheDocument();
    expect(screen.getByText('No weddings found')).toBeInTheDocument();
  });

  it('displays a list of weddings', async () => {
    // Mock the API response
    require('../../api').get.mockResolvedValueOnce({ data: mockWeddings });

    render(
      <MemoryRouter>
        <KanikalarPage />
      </MemoryRouter>
    );

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Bride 1 & Groom 1')).toBeInTheDocument();
      expect(screen.getByText('Venue 1')).toBeInTheDocument();
      expect(screen.getByText('Bride 2 & Groom 2')).toBeInTheDocument();
    });
  });

  it('opens the add wedding dialog when clicking the add button', async () => {
    render(
      <MemoryRouter>
        <KanikalarPage />
      </MemoryRouter>
    );

    const addButton = screen.getByText('Add Wedding');
    fireEvent.click(addButton);

    expect(screen.getByText('Add Wedding')).toBeInTheDocument();
  });

  it('allows searching for weddings', async () => {
    require('../../api').get.mockResolvedValueOnce({ data: mockWeddings });

    render(
      <MemoryRouter>
        <KanikalarPage />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Bride 1 & Groom 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Bride 2' } });

    // Only the matching wedding should be visible
    await waitFor(() => {
      expect(screen.queryByText('Bride 1 & Groom 1')).not.toBeInTheDocument();
      expect(screen.getByText('Bride 2 & Groom 2')).toBeInTheDocument();
    });
  });

  // Add more test cases as needed
});
