import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  Clock, 
  XCircle,
  Mail,
  Calendar,
  User,
  Building2,
  Eye,
  Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Application, ApplicationStatus as AppStatus } from '../types';
import { applicationApi } from '../utils/api';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.email) {
      loadUserApplications();
    }
  }, [user]);

  const loadUserApplications = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await applicationApi.getByEmail(user.email);
      const apps = response.data.map((app: any) => ({
        ...app,
        submittedAt: new Date(app.submittedAt),
        updatedAt: new Date(app.updatedAt),
        statusHistory: app.statusHistory?.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })) || []
      }));
      setApplications(apps);
    } catch (error) {
      console.error('Error loading user applications:', error);
      setError('Failed to load your applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: AppStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'ccc_review':
      case 'awaiting_primary_approval':
      case 'fis_entry_pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: AppStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ccc_review':
      case 'awaiting_primary_approval':
      case 'fis_entry_pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: AppStatus) => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'ccc_review':
        return 'CCC Review';
      case 'awaiting_primary_approval':
        return 'Pending Approval';
      case 'fis_entry_pending':
        return 'FIS Entry Pending';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const handleViewApplication = (applicationId: string) => {
    navigate(`/status/${applicationId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Applications</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={loadUserApplications}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Applications</h1>
            <p className="text-gray-600">
              Track the status of your secondary appointment applications to the College of Connected Computing
            </p>
          </div>
          <button
            onClick={() => navigate('/apply')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </button>
        </div>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Found</h3>
          <p className="text-gray-600 mb-6">
            You haven't submitted any applications yet. Ready to join the College of Connected Computing?
          </p>
          <button
            onClick={() => navigate('/apply')}
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-5 w-5" />
            Submit Your First Application
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Your Applications ({applications.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {applications.map((application) => {
              const processingDays = Math.floor((new Date().getTime() - new Date(application.submittedAt).getTime()) / (1000 * 3600 * 24));
              
              return (
                <div key={application.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-grow">
                      {/* Application Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">
                            Application {application.id}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(application.status)}`}>
                            {getStatusIcon(application.status)}
                            <span className="ml-1">{getStatusLabel(application.status)}</span>
                          </span>
                        </div>
                        <button
                          onClick={() => handleViewApplication(application.id)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </button>
                      </div>

                      {/* Application Details */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          {application.facultyMember?.name || user?.name}
                        </div>
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2" />
                          {application.facultyMember?.department} {application.facultyMember?.college}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Submitted {application.submittedAt.toLocaleDateString()}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Mail className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Need Help?</p>
            <p>
              If you have questions about your application status or the approval process, 
              contact the CCC Dean's Office at cccfacultyaffairs@vanderbilt.edu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;