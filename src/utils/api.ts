// API utility functions for connecting to backend services
// This file provides the interface for future backend integration

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    headers: { ...defaultHeaders, ...options.headers },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Application API endpoints
export const applicationApi = {
  // Submit new application
  submit: async (applicationData: FormData): Promise<ApiResponse<{ applicationId: string }>> => {
    return apiRequest('/applications', {
      method: 'POST',
      body: applicationData,
      headers: {}, // Remove Content-Type for FormData
    });
  },

  // Get application by ID
  getById: async (id: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/applications/${id}`);
  },

  // Search applications
  search: async (query: string): Promise<ApiResponse<any[]>> => {
    return apiRequest(`/applications/search?q=${encodeURIComponent(query)}`);
  },

  // Get all applications (for dashboard)
  getAll: async (filters?: any): Promise<ApiResponse<any[]>> => {
    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return apiRequest(`/applications${queryParams}`);
  },

  // Update application status
  updateStatus: async (id: string, status: string, notes?: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Reminder functionality removed
};

// College and organizational data API
export const organizationApi = {
  // Get all colleges
  getColleges: async (): Promise<ApiResponse<any[]>> => {
    return apiRequest('/colleges');
  },

  // Create or update college
  saveCollege: async (college: any): Promise<ApiResponse<any>> => {
    const method = college.id ? 'PUT' : 'POST';
    const endpoint = college.id ? `/colleges/${college.id}` : '/colleges';
    
    return apiRequest(endpoint, {
      method,
      body: JSON.stringify(college),
    });
  },

  // Delete college
  deleteCollege: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiRequest(`/colleges/${id}`, {
      method: 'DELETE',
    });
  },

  // Get organizational chart data from Oracle API
  getOrgChart: async (college?: string): Promise<ApiResponse<any>> => {
    const endpoint = college ? `/org-chart?college=${college}` : '/org-chart';
    return apiRequest(endpoint);
  },
};

// Dashboard and analytics API
export const analyticsApi = {
  // Get dashboard metrics
  getMetrics: async (timeframe?: string): Promise<ApiResponse<any>> => {
    const endpoint = timeframe ? `/metrics?timeframe=${timeframe}` : '/metrics';
    return apiRequest(endpoint);
  },

  // Export data
  exportData: async (format: 'csv' | 'json' = 'csv'): Promise<ApiResponse<{ downloadUrl: string }>> => {
    return apiRequest(`/export?format=${format}`);
  },

  // Get processing time trends
  getTrends: async (): Promise<ApiResponse<any[]>> => {
    return apiRequest('/trends');
  },
};

// System settings API
export const settingsApi = {
  // Get system settings
  getSettings: async (): Promise<ApiResponse<any>> => {
    return apiRequest('/settings');
  },

  // Update system settings
  updateSettings: async (settings: any): Promise<ApiResponse<any>> => {
    return apiRequest('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
};

// Notification API removed - functionality no longer available

export { ApiError };