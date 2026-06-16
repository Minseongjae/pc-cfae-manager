import { getDashboardStats as getStatsFromStorage } from '@/lib/storage';
import type { DashboardStats } from '@/types';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return getStatsFromStorage();
}
