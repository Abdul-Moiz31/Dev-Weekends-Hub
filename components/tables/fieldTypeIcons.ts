import type { FieldType } from '@/types';

/** Short labels for header chrome (not the user-editable column title). */
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  time: 'Time',
  datetime: 'Date & time',
  status: 'Status',
  url: 'URL',
  checkbox: 'Checkbox',
  person: 'Person',
  longtext: 'Long text',
  select: 'Select',
  email: 'Email',
  phone: 'Phone',
};

export const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: 'T',
  number: '#',
  date: '📅',
  time: '⏰',
  datetime: '🗓',
  status: '●',
  url: '🔗',
  checkbox: '☑',
  person: '👤',
  longtext: '¶',
  select: '▼',
  email: '@',
  phone: '📞',
};
