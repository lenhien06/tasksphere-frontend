import { apiJava } from '@/lib/axios';

export interface PerformancePredictionResult {
  employeeId: string;
  predictedPerformanceScore: number;
  healthScore: number;
  trend: string;
  history: number[];
  attritionProbability: number;
  topContributingFactors: string[];
  rootCauses: string[];
  recommendations: string[];
  confidence: number;
  errorMessage?: string;
}

export class UserService {
  static async searchUsers(keyword: string) {
    const response = await apiJava.get(`/v1/users/search?keyword=${encodeURIComponent(keyword)}`);
    return response.data?.data || [];
  }

  static async getRoleCounts() {
    const response = await apiJava.get('/v1/users/roles/counts');
    return response.data?.data || [];
  }

  static async getOverallPerformance(userId: string) {
    const response = await apiJava.get(`/v1/users/${userId}/overall-performance`);
    return response.data?.data;
  }

  static async getPerformancePrediction(userId: string): Promise<PerformancePredictionResult> {
    const response = await apiJava.get(`/v1/users/${userId}/performance-prediction`);
    return response.data?.data || {};
  }
}
