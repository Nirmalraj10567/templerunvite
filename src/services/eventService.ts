import { Event, EventImage } from '@/types/event';
import { toast } from '@/components/ui/use-toast';

class EventService {
  private apiUrl = 'http://localhost:4000/api/events';
  private get apiOrigin() {
    try {
      return new URL(this.apiUrl).origin;
    } catch {
      return '';
    }
  }

  async createEvent(eventData: Event): Promise<Event> {
    try {
      // Create FormData for multipart/form-data upload
      const formData = new FormData();
      
      // Append event details
      formData.append('title', eventData.title);
      formData.append('description', eventData.description);
      formData.append('date', eventData.date);
      formData.append('time', eventData.time);
      formData.append('location', eventData.location);

      // Append images
      eventData.images.forEach((image) => {
        // For multer upload.array('images', ...), each file must use the same field name: 'images'
        formData.append('images', image.file as File);
      });
      // Append titles/captions as repeated fields to form arrays the backend expects
      eventData.images.forEach((image) => {
        formData.append('imageTitles', image.title ?? '');
      });
      eventData.images.forEach((image) => {
        formData.append('imageCaptions', image.caption ?? '');
      });

      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      return await response.json();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
      throw error;
    }
  }

  async getEvents(page = 1, pageSize = 10, search = ''): Promise<{ 
    data: Event[], 
    total: number, 
    page: number, 
    pageSize: number 
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search
      });

      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.apiUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch events');
      }

      const json = await response.json();
      // Normalize list images to objects with url/title/caption
      const data: Event[] = (json.data || []).map((evt: any) => {
        let images: EventImage[] = [];
        if (Array.isArray(evt.images)) {
          images = evt.images.map((img: any) => {
            if (typeof img === 'string') {
              // Legacy string path
              return { url: `${this.apiOrigin}/public${img}` } as EventImage;
            }
            // Object with id, url, title, caption
            return {
              id: img.id,
              url: img.url || (img.image_path ? `${this.apiOrigin}/public${img.image_path}` : undefined),
              title: img.title ?? undefined,
              caption: img.caption ?? undefined,
            } as EventImage;
          });
        }
        return {
          id: evt.id,
          title: evt.title,
          description: evt.description,
          date: evt.date,
          time: evt.time,
          location: evt.location,
          images,
          created_at: evt.created_at,
          updated_at: evt.updated_at,
        } as Event;
      });
      return { ...json, data };
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
      throw error;
    }
  }

  async getEventById(id: string): Promise<Event> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${this.apiUrl}/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch event');
      }

      const event = await response.json();
      
      // Process images to ensure consistent format
      let images: EventImage[] = [];
      if (Array.isArray(event.images)) {
        images = event.images.map((img: any) => ({
          id: img.id,
          url: img.url || (img.image_path ? `${this.apiOrigin}/public${img.image_path}` : undefined),
          title: img.title ?? undefined,
          caption: img.caption ?? undefined,
        }));
      }

      return {
        ...event,
        images
      };
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
      throw error;
    }
  }

  async updateEvent(id: string, eventData: Event): Promise<Event> {
    try {
      const formData = new FormData();
      
      // Append event details
      formData.append('title', eventData.title);
      formData.append('description', eventData.description);
      formData.append('date', eventData.date);
      formData.append('time', eventData.time);
      formData.append('location', eventData.location);

      // Separate existing vs new images
      const existingImages = eventData.images.filter(img => !img.file && typeof img.id === 'number');
      const newImages = eventData.images.filter(img => img.file instanceof File);

      // Send existing image metadata updates (parallel arrays)
      if (existingImages.length > 0) {
        existingImages.forEach(img => formData.append('existingImageIds', String(img.id)));
        existingImages.forEach(img => formData.append('existingImageTitles', img.title ?? ''));
        existingImages.forEach(img => formData.append('existingImageCaptions', img.caption ?? ''));
      }

      // Append new images and their titles/captions in the same order
      newImages.forEach((img) => {
        formData.append('images', img.file as File);
      });
      newImages.forEach((img) => {
        formData.append('imageTitles', img.title ?? '');
      });
      newImages.forEach((img) => {
        formData.append('imageCaptions', img.caption ?? '');
      });

      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      return await response.json();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
      throw error;
    }
  }
}

export default new EventService();
