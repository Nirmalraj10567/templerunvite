// Shared app types

export type AcademicProgram = {
  id?: string;
  name?: string;
  description?: string;
  duration?: string;
  eligibility?: string;
};

export type AcademicSection = {
  title: string;
  subtitle: string;
  programs: AcademicProgram[];
  additionalInfo?: string;
};

export type AdmissionForm = {
  id: string;
  name: string;
  isActive: boolean;
  // Extend as backend evolves
  [key: string]: unknown;
};
