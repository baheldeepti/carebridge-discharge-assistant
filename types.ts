
export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  purpose: string;
  special_instructions: string;
  side_effects_search?: string;
  safety_alert?: string;
  sources?: { title: string; uri: string }[];
}

export interface TimelineEvent {
  time: string;
  activity: string;
  category: 'medication' | 'rest' | 'check' | 'nutrition';
}

export interface MedicationVerification {
  is_match: boolean;
  mismatch_details: string | null;
  confidence_score: number;
  detected_med_name: string;
  detected_dosage: string;
}

export interface FollowUp {
  provider: string;
  purpose: string;
  date_or_timing: string;
  location_or_contact: string;
  map_url?: string;
}

export interface HomeCareInstruction {
  text: string;
  category: 'rest' | 'diet' | 'activity' | 'wound' | 'medication' | 'general';
}

export interface StructuredExtraction {
  patient_summary: string;
  medications: Medication[];
  follow_ups: FollowUp[];
  red_flags: string[];
  home_care_instructions: HomeCareInstruction[];
  recovery_timeline: TimelineEvent[];
  ambiguities_or_risks: string[];
  care_team_contact: {
    name: string;
    phone: string;
    description: string;
  } | null;
}

export interface DischargeAnalysis {
  structured_extraction: StructuredExtraction;
  plain_language_explanation: string;
  teach_back_questions: string[];
  detected_language: string;
}

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
}
