import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

export interface PdfSettings {
  title_main?: string | null;
  title_sub?: string | null;
  title_line2?: string | null;
  subheader?: string | null;
  tax_subheader?: string | null;
  annadhanam_subheader?: string | null;
  logo_url?: string | null;
}

export const pdfSettingsService = {
  async get(): Promise<PdfSettings> {
    const resp: any = await axios.get('/api/pdf-settings', {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    return resp?.data?.data || {};
  },
  async update(payload: PdfSettings): Promise<PdfSettings> {
    const resp: any = await axios.put('/api/pdf-settings', payload, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    return resp?.data?.data || {};
  },
  async uploadLogo(file: File): Promise<PdfSettings> {
    const form = new FormData();
    form.append('logo', file);
    const resp: any = await axios.post('/api/pdf-settings/logo', form, {
      headers: { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'multipart/form-data' },
    });
    return resp?.data?.data || {};
  },
};
