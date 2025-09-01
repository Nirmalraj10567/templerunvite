import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WeddingDetailPage from './WeddingDetailPage';
import '@testing-library/jest-dom';

// Mock the API calls
jest.mock('../../api', () => ({
  get: jest.fn((url) => {
    if (url.includes('kanikalar/1')) {
      return Promise.resolve({
        data: {
          id: 1,
          bride_name: 'Bride 1',
          groom_name: 'Groom 1',
          wedding_date: '2025-12-31',
          venue: 'Venue 1',
          contact_number: '1234567890',
          email: 'test1@example.com'
        }
      });
    }
    return Promise.resolve({ data: [] });
  }),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
}));

describe('WeddingDetailPage', () => {
  const mockEvents = [
    {
      id: 1,
      kanikalar_id: 1,
      event_name: 'Reception',
      event_date: '2025-12-31',
      event_time: '19:00',
      location: 'Venue 1',
      description: 'Wedding Reception'
    },
    {
      id: 2,
      kanikalar_id: 1,
      event_name: 'Ceremony',
      event_date: '2025-12-31',
      event_time: '16:00',
      location: 'Temple',
      description: 'Wedding Ceremony'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays wedding details and events', async () => {
    // Mock the API response for events
    require('../../api').get.mockImplementation((url) => {
      if (url.includes('wedding-events/1')) {
        return Promise.resolve({ data: mockEvents });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={['/kanikalar/1']}>
        <Routes>
          <Route path="/kanikalar/:id" element={<WeddingDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check if wedding details are displayed
    await waitFor(() => {
      expect(screen.getByText('Bride 1 & Groom 1')).toBeInTheDocument();
      expect(screen.getByText('Venue 1')).toBeInTheDocument();
      
      // Check if events are displayed
      expect(screen.getByText('Reception')).toBeInTheDocument();
      expect(screen.getByText('Ceremony')).toBeInTheDocument();
    });
  });

  it('opens the add event dialog when clicking the add button', async () => {
    render(
      <MemoryRouter initialEntries={['/kanikalar/1']}>
        <Routes>
          <Route path="/kanikalar/:id" element={<WeddingDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const addButton = await screen.findByText('Add Event');
    fireEvent.click(addButton);

    expect(screen.getByText('Add Event')).toBeInTheDocument();
  });

  it('allows deleting an event', async () => {
    // Mock the API response for events
    require('../../api').get.mockImplementation((url) => {
      if (url.includes('wedding-events/1')) {
        return Promise.resolve({ data: mockEvents });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={['/kanikalar/1']}>
        <Routes>
          <Route path="/kanikalar/:id" element={<WeddingDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the delete button to appear and click it
    const deleteButtons = await screen.findAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion
    const confirmButton = await screen.findByText('Delete');
    fireEvent.click(confirmButton);

    // Check if delete API was called
    await waitFor(() => {
      expect(require('../../api').delete).toHaveBeenCalledWith('wedding-events/1');
    });
  });
});
