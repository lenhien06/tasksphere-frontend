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
    const raw = response.data?.data || response.data || {};
    return {
      employeeId: raw.employeeId ?? raw.employee_id ?? "",
      predictedPerformanceScore: raw.predictedPerformanceScore ?? raw.predicted_performance_score ?? 0,
      healthScore: raw.healthScore ?? raw.health_score ?? 0,
      trend: raw.trend || "Stable",
      history: raw.history || [],
      attritionProbability: raw.attritionProbability ?? raw.attrition_probability ?? 0,
      topContributingFactors: raw.topContributingFactors ?? raw.top_contributing_factors ?? [],
      rootCauses: raw.rootCauses ?? raw.root_causes ?? [],
      recommendations: raw.recommendations || [],
      confidence: raw.confidence ?? 0,
      errorMessage: raw.errorMessage || raw.error_message,
    };
  }
}
