export interface DocumentAnalyticsResponse {
  rangeDays: number;
  totalViews: number;
  uniqueViewers: number;
  daily: Array<{ date: string; totalViews: number; uniqueViewers: number }>;
  viewers: Array<{
    id: string;
    name: string;
    avatar: string | null;
    lastViewedAt: string;
    totalViews: number;
  }>;
}
