export interface MobileEvent {
  id: number;
  title: string;
  description?: string | null;
  date: string;
  time: string;
  location: string;
  image?: string | null;
}

interface ApiError {
  error?: string;
  message?: string;
  details?: string;
}

export class EventMobileService {
  private baseUrl = 'http://localhost:4000/api/events/mobile';

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorText = `HTTP ${response.status}`;
      try {
        const data: ApiError = await response.json();
        errorText = data.error || data.message || data.details || errorText;
      } catch {}
      throw new Error(errorText);
    }
    return response.json();
  }

  /**
   * Get upcoming events for mobile (public, no auth required)
   * Backend: GET /api/events/mobile/events
   */
  async getEvents(): Promise<MobileEvent[]> {
    const response = await fetch(`${this.baseUrl}/events`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return this.handleResponse<MobileEvent[]>(response);
  }

  /**
   * Utility to map a MobileEvent into the desktop Event shape if needed
   * (images array with one entry containing url)
   */
  toDesktopEvent(me: MobileEvent) {
    return {
      id: me.id,
      title: me.title,
      description: me.description || '',
      date: me.date,
      time: me.time,
      location: me.location,
      images: me.image ? [{ url: me.image }] : [],
    };
  }
}

export const eventMobileService = new EventMobileService();
