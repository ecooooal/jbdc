import type { DesignStatus } from '@/features/database';

const STATUS_LABELS: Record<DesignStatus, string> = {
  concept: 'Concept',
  in_development: 'In Development',
  approved: 'Approved',
  produced: 'Produced',
  rejected: 'Rejected',
  archived: 'Archived',
};

/** The owner-facing name of a Status, as written in GLOSSARY.md. */
export function designStatusLabel(status: DesignStatus): string {
  return STATUS_LABELS[status];
}
