export type UserRole = 'admin' | 'editor' | 'viewer';

export type EmailTemplateKey =
  | 'invite_admin'
  | 'invite_editor'
  | 'invite_viewer'
  | 'mentor_reminder_default'
  | 'mentor_added_default';

export type EmailTemplateCategory = 'invite' | 'mentor';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'status'
  | 'url'
  | 'checkbox'
  | 'person'
  | 'longtext'
  | 'select'
  | 'email'
  | 'phone'
  | 'mentor';

export interface TableColumn {
  id: string;
  table_id: string;
  name: string;
  field_type: FieldType;
  position: number;
  is_required: boolean;
  options: { label: string; color: string }[] | null;
  created_at: string;
}

export interface DynamicTable {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  columns?: TableColumn[];
  row_count?: number;
}

/** Assigned mentors for a sheet (ordered slots); profiles joined when querying */
export interface TableMentor {
  id: string;
  table_id: string;
  profile_id: string;
  slot: number;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email'>;
}

/** Passed when creating a table */
export interface MentorSelectionPayload {
  slotCount: number;
  /** Profile IDs in slot order; omit or duplicate-filtered client-side */
  profileIds: string[];
}

export interface TableRow {
  id: string;
  table_id: string;
  data: Record<string, unknown>;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type LinkCategory =
  | 'repo'
  | 'canva'
  | 'figma'
  | 'docs'
  | 'video'
  | 'slides'
  | 'notion'
  | 'discord'
  | 'other';

export interface Link {
  id: string;
  category: LinkCategory;
  title: string;
  url: string;
  description: string | null;
  tags: string[] | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'avatar_url'>;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'avatar_url'>;
}

export interface EmailTemplate {
  id: string;
  key: EmailTemplateKey;
  category: EmailTemplateCategory;
  name: string;
  subject: string;
  html: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_COLORS: Record<string, string> = {
  'Not Started': '#6b7280',
  'In Progress': '#f59e0b',
  'Completed': '#10b981',
  'On Hold': '#8b5cf6',
  'Cancelled': '#ef4444',
};

export const DEFAULT_STATUS_OPTIONS = [
  { label: 'Not Started', color: '#6b7280' },
  { label: 'In Progress', color: '#f59e0b' },
  { label: 'Completed', color: '#10b981' },
  { label: 'On Hold', color: '#8b5cf6' },
  { label: 'Cancelled', color: '#ef4444' },
];
