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

  // Get applications by user email
  getByEmail: async (email: string): Promise<ApiResponse<any[]>> => {
    return apiRequest(`/applications/my-applications?email=${encodeURIComponent(email)}`);
  },

  // Get all applications (for dashboard)
  getAll: async (filters?: any): Promise<ApiResponse<any[]>> => {
    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return apiRequest(`/applications${queryParams}`);
  },

  // Update application status
  updateStatus: async (id: string, status: string, notes?: string, approver?: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes, approver }),
    });
  },

  // Process approval/denial from signature page
  processApproval: async (approvalData: {
    applicationId: string;
    approverEmail: string;
    action: 'approve' | 'deny';
    signature: string;
    notes?: string;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    return apiRequest(`/applications/${approvalData.applicationId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        approverEmail: approvalData.approverEmail,
        action: approvalData.action,
        signature: approvalData.signature,
        notes: approvalData.notes
      }),
    });
  },

  // Download CV file
  downloadCV: async (applicationId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/cv`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('CV file not found');
      }
      throw new Error(`Failed to download CV: ${response.status}`);
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `CV-${applicationId}.pdf`; // default
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
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
    const endpoint = timeframe ? `/analytics/metrics?timeframe=${timeframe}` : '/analytics/metrics';
    return apiRequest(endpoint);
  },

  // Export data
  exportData: async (format: 'csv' | 'json' = 'csv'): Promise<ApiResponse<{ downloadUrl: string }>> => {
    return apiRequest(`/analytics/export?format=${format}`);
  },

  // Get processing time trends
  getTrends: async (): Promise<ApiResponse<any[]>> => {
    return apiRequest('/analytics/trends');
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

  // Update individual setting
  updateSetting: async (key: string, value: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },
};

// Notification API removed - functionality no longer available

export { ApiError };