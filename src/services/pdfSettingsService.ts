import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

export interface PdfSettings {
  title_main?: string | null;
  title_sub?: string | null;
  title_line2?: string | null;
  subheader?: string | null;
  tax_subheader?: string | null;
  // Tax-specific labels
  tax_receipt_label?: string | null;
  tax_date_label?: string | null;
  tax_year_label?: string | null;
  tax_cell_label?: string | null;
  tax_collector_label?: string | null;
  annadhanam_subheader?: string | null;
  hall_subheader?: string | null;
  // Pooja-specific
  pooja_subheader?: string | null;
  // General
  watermark_text?: string | null;
  logo_url?: string | null;
  // Annadhanam-specific labels
  annadhanam_receipt_label?: string | null;
  annadhanam_date_label?: string | null;
  annadhanam_year_label?: string | null;
  annadhanam_cell_label?: string | null;
  annadhanam_collector_label?: string | null;
  // Hall-specific labels
  hall_receipt_label?: string | null;
  hall_date_label?: string | null;
  hall_year_label?: string | null;
  hall_cell_label?: string | null;
  hall_collector_label?: string | null;
  // Pooja-specific labels
  pooja_receipt_label?: string | null;
  pooja_date_label?: string | null;
  pooja_year_label?: string | null;
  pooja_cell_label?: string | null;
  pooja_collector_label?: string | null;
}

export const pdfSettingsService = {
  async get(): Promise<PdfSettings> {
    const resp: any = await axios.get('https://tmsapi.xesstechlink.com/api/pdf-settings', {
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
