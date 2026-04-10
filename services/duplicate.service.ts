import { findDuplicateGroups } from '@/lib/features/duplicate';

export async function getDuplicateGroups() {
  return findDuplicateGroups();
}
