import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle,
  Search,
  Mail,
  Calendar,
  User,
  Building2,
  ArrowRight,
  Download
} from 'lucide-react';
import { Application, ApplicationStatus as AppStatus, StatusHistoryItem } from '../types';

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
        return <Clock className="h-5 w-5 text-blue-500" />;
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
        return 'border-blue-200 bg-blue-50';
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock application data
      const mockApplication: Application = {
        id: 'APP-2024-001',
        facultyMember: {
          id: '1',
          name: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@vanderbilt.edu',
          department: 'Computer Science',
          college: 'Engineering',
          institution: 'vanderbilt',
          title: 'Associate Professor'
        },
        approvalChain: {
          departmentChair: { name: 'Dr. Robert Chen', email: 'robert.chen@vanderbilt.edu' },
          dean: { name: 'Dr. Patricia Williams', email: 'patricia.williams@vanderbilt.edu' },
          hasDepartments: true
        },
        status: 'awaiting_primary_approval',
        submittedAt: new Date('2024-10-01'),
        updatedAt: new Date('2024-10-05'),
        rationale: 'Research collaboration in AI/ML with CCC faculty members.',
        statusHistory: [
          {
            status: 'submitted',
            timestamp: new Date('2024-10-01T09:00:00'),
            notes: 'Application submitted successfully'
          },
          {
            status: 'ccc_review',
            timestamp: new Date('2024-10-02T14:30:00'),
            approver: 'Dr. CCC Dean',
            notes: 'CV and rationale reviewed, approved for next stage'
          }
        ],
        currentApprover: 'Dr. Robert Chen (Department Chair)',
        fisEntered: false
      };

      onApplicationFound(mockApplication);
    } catch (error) {
      setSearchError('Application not found. Please check your application ID or email.');
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
      // Simulate loading application by ID from URL
      const loadApplication = async () => {
        setLoading(true);
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Mock application would be loaded here
          setLoading(false);
        } catch (error) {
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
      }
    ];

    // Add faculty vote step (currently bypassed)
    // steps.push({
    //   key: 'faculty_vote',
    //   label: 'Faculty Vote',
    //   description: 'CCC faculty members are voting on your appointment.',
    // });

    // Add primary approval step
    if (app.approvalChain.hasDepartments && app.approvalChain.departmentChair) {
      steps.push({
        key: 'awaiting_primary_approval',
        label: 'Department Chair Approval',
        description: `Waiting for approval from your department chair: ${app.approvalChain.departmentChair.name}`,
      });
    }

    steps.push({
      key: 'awaiting_primary_approval',
      label: 'Dean Approval',
      description: `Waiting for approval from your college dean: ${app.approvalChain.dean.name}`,
    });

    steps.push({
      key: 'approved',
      label: 'Approved',
      description: 'Your secondary appointment has been approved by all required parties.',
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

  const getStepStatus = (stepKey: string, currentStatus: AppStatus, statusHistory: StatusHistoryItem[]) => {
    // Find if this step has been completed
    const historyItem = statusHistory.find(item => item.status === stepKey);
    
    if (historyItem) {
      return 'completed';
    } else if (stepKey === currentStatus) {
      return 'current';
    } else {
      // Check if we've passed this step
      const statusOrder: AppStatus[] = [
        'submitted',
        'ccc_review', 
        'faculty_vote',
        'awaiting_primary_approval',
        'approved',
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
    }
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
                {application.facultyMember.department}, {application.facultyMember.college}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Submitted {application.submittedAt.toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">Processing Time</div>
            <div className="text-2xl font-bold text-primary-600">{processingDays} days</div>
            <div className="text-sm text-gray-500">Target: 14 days</div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Progress Overview</h3>
        
        <div className="space-y-4">
          {workflowSteps.map((step, index) => {
            const stepStatus = getStepStatus(step.key, application.status, application.statusHistory);
            const historyItem = application.statusHistory.find(item => item.status === step.key);
            
            return (
              <div key={step.key} className="relative">
                <StatusStep
                  label={step.label}
                  description={step.description}
                  status={stepStatus}
                  date={historyItem?.timestamp}
                  approver={historyItem?.approver}
                  notes={historyItem?.notes}
                />
                
                {index < workflowSteps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
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
            <p className="text-gray-900">{workflowSteps.find(s => s.key === application.status)?.label || 'Unknown'}</p>
            
            <h4 className="text-sm font-medium text-gray-700 mt-4 mb-2">Current Approver</h4>
            <p className="text-gray-900">{application.currentApprover || 'CCC Staff'}</p>
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
            <div className="flex justify-between">
              <span>Dean:</span>
              <span>{application.approvalChain.dean.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Download className="mr-2 h-4 w-4" />
          Download Application
        </button>
        <button 
          onClick={() => setApplication(null)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <Search className="mr-2 h-4 w-4" />
          Track Another Application
        </button>
      </div>
    </div>
  );
};

export default ApplicationStatus;