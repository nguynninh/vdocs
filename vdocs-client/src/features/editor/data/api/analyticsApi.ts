import { api } from "@/src/services/axios";

export interface DailyViewStat {
  date: string;
  totalViews: number;
  uniqueViewers: number;
}

export interface ViewerStat {
  id: string;
  name: string;
  avatar: string | null;
  lastViewedAt: string;
  totalViews: number;
}

export interface DocumentAnalyticsApiResponse {
  rangeDays: number;
  totalViews: number;
  uniqueViewers: number;
  daily: DailyViewStat[];
  viewers: ViewerStat[];
}

export const analyticsApi = {
  get: (documentId: string, rangeDays = 28) =>
    api.get<DocumentAnalyticsApiResponse>(`/documents/${documentId}/analytics`, {
      params: { days: rangeDays },
    }),
};
