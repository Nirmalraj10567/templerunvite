export interface EventImage {
  id?: number;
  file?: File;
  title?: string;
  caption?: string;
  url?: string;
}

export interface Event {
  id?: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  images: EventImage[];
  created_at?: string;
  updated_at?: string;
}
