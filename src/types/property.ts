export interface Property {
  id?: number;
  property_no: string;
  survey_no: string;
  ward_no: string;
  street_name: string;
  area: string;
  city: string;
  pincode: string;
  owner_name: string;
  owner_mobile: string;
  owner_aadhaar?: string;
  owner_address?: string;
  tax_amount: number;
  tax_year: number;
  tax_status: 'pending' | 'paid' | 'partial' | 'exempted';
  last_paid_date?: string | null;
  pending_amount: number;
  created_by: number;
  temple_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyListResponse {
  success: boolean;
  data: Property[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PropertyResponse {
  success: boolean;
  data: Property;
  message?: string;
}

export interface PropertyFormData extends Omit<Property, 'id' | 'created_by' | 'temple_id' | 'created_at' | 'updated_at'> {
  // This extends the Property type but makes some fields optional for the form
  id?: number;
}
