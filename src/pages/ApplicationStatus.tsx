import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle, 
  Clock, 
  XCircle,
  Search,
  Mail,
  Calendar,
  User,
  Building2,
  Download
} from 'lucide-react';
import { Application, ApplicationStatus as AppStatus, StatusHistoryItem } from '../types';
import { applicationApi } from '../utils/api';

interface StatusStepProps {
  label: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'rejected';
  date?: Date;
  approver?: string;
  notes?: string;
}

const StatusStep: React.FC<StatusStepProps> = ({ label, description, status, date, approver, notes }) => {
  const getStepIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'current':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'current':
        return 'border-yellow-200 bg-yellow-50';
      case 'rejected':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStepColor()}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getStepIcon()}
        </div>
        <div className="flex-grow">
          <h4 className="text-sm font-medium text-gray-900">{label}</h4>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
          
          {(date || approver) && (
            <div className="mt-2 space-y-1">
              {date && (
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                </div>
              )}
              {approver && (
                <div className="flex items-center text-xs text-gray-500">
                  <User className="h-3 w-3 mr-1" />
                  {approver}
                </div>
              )}
              {notes && (
                <p className="text-xs text-gray-600 italic mt-1">{notes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ApplicationLookupProps {
  onApplicationFound: (application: Application) => void;
}

const ApplicationLookup: React.FC<ApplicationLookupProps> = ({ onApplicationFound }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setSearchError('Please enter an application ID or email address');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      let foundApplication: Application | null = null;

      // First try to search by application ID if it looks like one
      if (searchQuery.startsWith('APP-') || searchQuery.match(/^[A-Z]+-\d{4}-[A-Z0-9]+$/)) {
        try {
          const response = await applicationApi.getById(searchQuery);
          foundApplication = response.data;
        } catch (error) {
          // If not found by ID, continue to search by email
        }
      }

      // If not found by ID or doesn't look like ID, search by query (email/name)
      if (!foundApplication) {
        const searchResponse = await applicationApi.search(searchQuery);
        if (searchResponse.data && searchResponse.data.length > 0) {
          foundApplication = searchResponse.data[0]; // Use first match
        }
      }

      if (foundApplication) {
        // Convert date strings to Date objects
        foundApplication.submittedAt = new Date(foundApplication.submittedAt);
        foundApplication.updatedAt = new Date(foundApplication.updatedAt);
        if (foundApplication.statusHistory) {
          foundApplication.statusHistory = foundApplication.statusHistory.map((item: StatusHistoryItem) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
        }
        onApplicationFound(foundApplication);
      } else {
        setSearchError('Application not found. Please check your application ID or email address.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Unable to search applications. Please try again later.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Track Your Application</h1>
        <p className="text-gray-600">
          Enter your application ID or email address to view your secondary appointment status
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSearch}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Application ID or Email Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 pl-10"
                placeholder="APP-2024-001 or your@email.edu"
              />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            </div>
            {searchError && (
              <p className="mt-2 text-sm text-red-600">{searchError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className={`w-full px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
              isSearching
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isSearching ? 'Searching...' : 'Track Application'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start">
            <Mail className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Need Help?</p>
              <p>
                If you don't have your application ID, you can use the email address you used to submit your application.
                For additional assistance, contact the CCC Dean's Office.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApplicationStatus: React.FC = () => {
  const { applicationId } = useParams();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(!!applicationId);

  useEffect(() => {
    if (applicationId) {
      const loadApplication = async () => {
        setLoading(true);
        try {
          const response = await applicationApi.getById(applicationId);
          const app = response.data;
          
          // Convert date strings to Date objects
          app.submittedAt = new Date(app.submittedAt);
          app.updatedAt = new Date(app.updatedAt);
          if (app.statusHistory) {
            app.statusHistory = app.statusHistory.map((item: StatusHistoryItem) => ({
              ...item,
              timestamp: new Date(item.timestamp)
            }));
          }
          
          setApplication(app);
        } catch (error) {
          console.error('Error loading application:', error);
          // Application not found or error - will show search form
        } finally {
          setLoading(false);
        }
      };
      loadApplication();
    }
  }, [applicationId]);

  const getWorkflowSteps = (app: Application) => {
    const steps = [
      {
        key: 'submitted',
        label: 'Application Submitted',
        description: 'Your application has been received and is in the queue for review.',
      },
      {
        key: 'ccc_review',
        label: 'CCC Review',
        description: 'The CCC Dean\'s office is reviewing your CV and rationale for mission alignment.',
      },
      {
        key: 'ccc_associate_dean_review',
        label: 'CCC Associate Dean Review',
        description: 'The CCC Associate Dean is reviewing your application for final CCC approval.',
      }
    ];

    // Add faculty vote step (currently bypassed)
    // steps.push({
    //   key: 'faculty_vote',
    //   label: 'Faculty Vote',
    //   description: 'CCC faculty members are voting on your appointment.',
    // });

    // Add primary approval steps dynamically based on approval chain
    const primaryApprovers = [];
    
    if (app.approvalChain.departmentChair) {
      primaryApprovers.push({
        title: 'Department Chair',
        name: app.approvalChain.departmentChair.name
      });
    }
    
    if (app.approvalChain.divisionChair) {
      primaryApprovers.push({
        title: 'Division Chair',
        name: app.approvalChain.divisionChair.name
      });
    }
    
    if (app.approvalChain.seniorAssociateDean) {
      primaryApprovers.push({
        title: 'Associate Dean',
        name: app.approvalChain.seniorAssociateDean.name
      });
    }
    
    if (app.approvalChain.dean) {
      primaryApprovers.push({
        title: 'Dean',
        name: app.approvalChain.dean.name
      });
    }
    
    // Add steps for each primary approver
    primaryApprovers.forEach((approver, index) => {
      steps.push({
        key: 'awaiting_primary_approval',
        label: `${approver.title} Approval`,
        description: `Waiting for approval from your ${approver.title.toLowerCase()}: ${approver.name}`,
      });
    });


    steps.push({
      key: 'fis_entry_pending',
      label: 'FIS Entry',
      description: 'Your appointment is being entered into the Faculty Information System.',
    });

    steps.push({
      key: 'completed',
      label: 'Completed',
      description: 'Your secondary appointment is complete and active.',
    });

    return steps;
  };

  const getStepStatus = (stepKey: string, currentStatus: AppStatus, statusHistory: StatusHistoryItem[] | undefined) => {
    // Special case: "completed" step should always be green (completed) when reached
    if (stepKey === 'completed' && currentStatus === 'completed') {
      return 'completed';
    }
    
    // First check: if this is the current status, it's current (not completed)
    if (stepKey === currentStatus) {
      return 'current';
    }
    
    // Second check: if this step appears in history and is not current, it's completed
    const historyItem = statusHistory?.find(item => item.status === stepKey);
    if (historyItem) {
      return 'completed';
    }
    
    // Third check: position-based logic for steps not in history
    // Check if we've passed this step
    const statusOrder: AppStatus[] = [
      'submitted',
      'ccc_review',
      'ccc_associate_dean_review', 
      'awaiting_primary_approval',
      'fis_entry_pending',
      'completed'
    ];
    
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepKey as AppStatus);
    
    if (currentIndex > stepIndex) {
      return 'completed';
    } else {
      return 'pending';
    }
  };

  // Helper function to get the approval information for a completed step
  const getStepApprovalInfo = (stepKey: string, currentStatus: AppStatus, statusHistory: StatusHistoryItem[] | undefined) => {
    const stepStatus = getStepStatus(stepKey, currentStatus, statusHistory);
    
    // Only show approval info for completed steps
    if (stepStatus !== 'completed') {
      return { date: undefined, approver: undefined, notes: undefined };
    }
    
    // Find the history entry that shows this step was completed
    // This is the entry that moved the application TO the next step
    const statusOrder: AppStatus[] = ['submitted', 'ccc_review', 'ccc_associate_dean_review', 'awaiting_primary_approval', 'fis_entry_pending', 'completed'];
    const stepIndex = statusOrder.indexOf(stepKey as AppStatus);
    
    if (stepIndex === -1 || stepIndex >= statusOrder.length - 1) {
      return { date: undefined, approver: undefined, notes: undefined };
    }
    
    const nextStatus = statusOrder[stepIndex + 1];
    const completionEntry = statusHistory?.find(item => item.status === nextStatus);
    
    if (completionEntry) {
      return {
        date: completionEntry.timestamp,
        approver: completionEntry.approver,
        notes: completionEntry.notes
      };
    }
    
    return { date: undefined, approver: undefined, notes: undefined };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!application) {
    return <ApplicationLookup onApplicationFound={setApplication} />;
  }

  const workflowSteps = getWorkflowSteps(application);
  const processingDays = Math.floor((new Date().getTime() - new Date(application.submittedAt).getTime()) / (1000 * 3600 * 24));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Application Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Application Status: {application.id}
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                {application.facultyMember.name}
              </div>
              <div className="flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                {application.facultyMember.department} {application.facultyMember.college}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Submitted {application.submittedAt.toLocaleDateString()}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Progress Overview</h3>
        
        {/* Rejection Banner */}
        {application.status === 'rejected' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-400 mr-3" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Application Not Approved</p>
                <p>
                  We're sorry, but your application for a secondary appointment has been declined at this time.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {workflowSteps.map((step, index) => {
            const stepStatus = getStepStatus(step.key, application.status, application.statusHistory || []);
            const approvalInfo = getStepApprovalInfo(step.key, application.status, application.statusHistory || []);
            
            return (
              <div key={step.key} className="relative">
                <StatusStep
                  label={step.label}
                  description={step.description}
                  status={stepStatus}
                  date={approvalInfo.date}
                  approver={approvalInfo.approver}
                  notes={approvalInfo.notes}
                />
                
                {index < workflowSteps.length - 1 && (
                  <div className="flex justify-center py-2">
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Status Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Status Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current Stage</h4>
            <p className="text-gray-900">{
              application.status === 'rejected' 
                ? 'Rejected' 
                : workflowSteps.find(s => s.key === application.status)?.label || 'Unknown'
            }</p>
            
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Last Updated</h4>
            <p className="text-gray-900">{application.updatedAt.toLocaleDateString()} at {application.updatedAt.toLocaleTimeString()}</p>
            
            <h4 className="text-sm font-medium text-gray-700 mt-4 mb-2">FIS Entry Status</h4>
            <p className="text-gray-900">
              {application.fisEntered ? 'Completed' : 'Pending'}
            </p>
          </div>
        </div>

        {/* Approval Chain */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Approval Chain</h4>
          <div className="space-y-2 text-sm">
            {application.approvalChain.departmentChair && (
              <div className="flex justify-between">
                <span>Department Chair:</span>
                <span>{application.approvalChain.departmentChair.name}</span>
              </div>
            )}
            {application.approvalChain.divisionChair && (
              <div className="flex justify-between">
                <span>Division Chair:</span>
                <span>{application.approvalChain.divisionChair.name}</span>
              </div>
            )}
            {application.approvalChain.seniorAssociateDean && (
              <div className="flex justify-between">
                <span>Associate Dean:</span>
                <span>{application.approvalChain.seniorAssociateDean.name}</span>
              </div>
            )}
            {application.approvalChain.dean && (
              <div className="flex justify-between">
                <span>Dean:</span>
                <span>{application.approvalChain.dean.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationStatus;