import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { College, Application, ApplicationStatus, FacultyMember } from '../types';
import { applicationApi, settingsApi } from '../utils/api';

interface TabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: { id: string; label: string; icon: React.ElementType }[];
}

const TabNavigation: React.FC<TabProps> = ({ activeTab, setActiveTab, tabs }) => (
  <div className="border-b border-gray-200">
    <nav className="-mb-px flex space-x-8">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <IconComponent className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  </div>
);

// Progress bar component for application status
const ApplicationProgress: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const steps = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'ccc_review', label: 'CCC Review' },
    { key: 'ccc_associate_dean_review', label: 'CCC Associate Dean' },
    { key: 'awaiting_primary_approval', label: 'Primary Approval' },
    { key: 'fis_entry_pending', label: 'FIS Entry' },
    { key: 'completed', label: 'Completed' }
  ];

  const statusOrder = {
    'submitted': 0,
    'ccc_review': 1,
    'ccc_associate_dean_review': 2,
    'awaiting_primary_approval': 3,
    'rejected': -1,
    'fis_entry_pending': 4,
    'completed': 5
  };

  const currentStep = statusOrder[status];
  const isRejected = status === 'rejected';

  // Get text color based on step status
  const getStepTextColor = (stepIndex: number) => {
    if (isRejected) {
      return 'text-red-600 font-medium';
    } else if (stepIndex === currentStep) {
      return 'text-primary-600 font-bold';
    } else if (stepIndex < currentStep) {
      return 'text-green-600 font-medium';
    } else {
      return 'text-gray-500';
    }
  };

  return (
    <div className="w-full">
      {/* Numbers and connection lines */}
      <div className="flex items-center mb-4 ml-12">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center w-8">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-gray-200 text-gray-600 border-2 border-gray-300">
                {index + 1}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  isRejected
                    ? 'bg-red-200'
                    : index < currentStep
                    ? 'bg-green-200'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Text labels */}
      <div className="flex ml-12">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex justify-center w-8">
              <span className={`text-xs ${getStepTextColor(index)} text-center`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2"></div>
            )}
          </div>
        ))}
      </div>
      
      {isRejected && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Rejected
          </span>
        </div>
      )}
    </div>
  );
};

// Application edit modal for admin use
const ApplicationEditModal: React.FC<{
  application: Application;
  onClose: () => void;
  onSave: (updatedApplication: Application) => void;
}> = ({ application, onClose, onSave }) => {
  const [formData, setFormData] = useState<Application>({
    ...application,
    primaryAppointmentEndDate: application.primaryAppointmentEndDate ? new Date(application.primaryAppointmentEndDate) : undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof Application, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFacultyChange = (field: keyof FacultyMember, value: string) => {
    setFormData(prev => ({
      ...prev,
      facultyMember: { ...prev.facultyMember, [field]: value }
    }));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.facultyMember.name.trim()) {
      newErrors['facultyMember.name'] = 'Name is required';
    }
    if (!formData.facultyMember.email.trim()) {
      newErrors['facultyMember.email'] = 'Email is required';
    } else if (!validateEmail(formData.facultyMember.email)) {
      newErrors['facultyMember.email'] = 'Invalid email format';
    }
    if (!formData.contributionsQuestion?.trim()) {
      newErrors.contributionsQuestion = 'Contributions question is required';
    }
    if (!formData.alignmentQuestion?.trim()) {
      newErrors.alignmentQuestion = 'Alignment question is required';
    }
    if (!formData.enhancementQuestion?.trim()) {
      newErrors.enhancementQuestion = 'Enhancement question is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const updatedApplication = {
      ...formData,
      updatedAt: new Date()
    };

    onSave(updatedApplication);
  };

  const statusOptions: { value: ApplicationStatus; label: string }[] = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'ccc_review', label: 'CCC Review' },
    { value: 'awaiting_primary_approval', label: 'Awaiting Primary Approval' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'fis_entry_pending', label: 'FIS Entry Pending' },
    { value: 'completed', label: 'Completed' }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium text-gray-900">Edit Application</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Faculty Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Faculty Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.facultyMember.name}
                    onChange={(e) => handleFacultyChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                      errors['facultyMember.name'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors['facultyMember.name'] && (
                    <p className="mt-1 text-sm text-red-600">{errors['facultyMember.name']}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.facultyMember.email}
                    onChange={(e) => handleFacultyChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                      errors['facultyMember.email'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors['facultyMember.email'] && (
                    <p className="mt-1 text-sm text-red-600">{errors['facultyMember.email']}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.facultyMember.title}
                    onChange={(e) => handleFacultyChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
                  <input
                    type="text"
                    value={formData.facultyMember.college}
                    onChange={(e) => handleFacultyChange('college', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.facultyMember.department || ''}
                    onChange={(e) => handleFacultyChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                  <select
                    value={formData.facultyMember.institution}
                    onChange={(e) => handleFacultyChange('institution', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="vanderbilt">Vanderbilt University</option>
                    <option value="vumc">Vanderbilt University Medical Center</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Application Status and Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Application Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Approver</label>
                  <input
                    type="text"
                    value={formData.currentApprover || ''}
                    onChange={(e) => handleInputChange('currentApprover', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                      errors.currentApprover ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Dr. John Smith (Department Chair)"
                  />
                  {errors.currentApprover && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentApprover}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin-Only Fields */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Admin-Only Fields</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Appointment End Date
                  </label>
                  <input
                    type="date"
                    value={formData.primaryAppointmentEndDate ? (formData.primaryAppointmentEndDate instanceof Date ? formData.primaryAppointmentEndDate.toISOString().split('T')[0] : formData.primaryAppointmentEndDate) : ''}
                    onChange={(e) => handleInputChange('primaryAppointmentEndDate', e.target.value ? new Date(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This date is only visible to administrators
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FIS Entered</label>
                  <select
                    value={formData.fisEntered.toString()}
                    onChange={(e) => handleInputChange('fisEntered', e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Three Questions */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contributions Question *</label>
                <p className="text-xs text-gray-500 mb-2">What specific contributions do you expect to make to the College of Connected Computing through this secondary appointment?</p>
                <textarea
                  value={formData.contributionsQuestion || ''}
                  onChange={(e) => handleInputChange('contributionsQuestion', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                    errors.contributionsQuestion ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.contributionsQuestion && (
                  <p className="mt-1 text-sm text-red-600">{errors.contributionsQuestion}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alignment Question *</label>
                <p className="text-xs text-gray-500 mb-2">How does your research, teaching, or service align with the interdisciplinary mission of the College of Connected Computing?</p>
                <textarea
                  value={formData.alignmentQuestion || ''}
                  onChange={(e) => handleInputChange('alignmentQuestion', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                    errors.alignmentQuestion ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.alignmentQuestion && (
                  <p className="mt-1 text-sm text-red-600">{errors.alignmentQuestion}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enhancement Question *</label>
                <p className="text-xs text-gray-500 mb-2">How will this secondary appointment enhance your primary academic work and benefit both your home department and the College of Connected Computing?</p>
                <textarea
                  value={formData.enhancementQuestion || ''}
                  onChange={(e) => handleInputChange('enhancementQuestion', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                    errors.enhancementQuestion ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.enhancementQuestion && (
                  <p className="mt-1 text-sm text-red-600">{errors.enhancementQuestion}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-gray-300 bg-primary-600 text-gray-700 text-sm font-medium rounded-md shadow-sm hover:bg-primary-700"
              >
                <Save className="inline mr-2 h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function to format status names for display
const formatStatusName = (status: string): string => {
  return status.replace(/_/g, ' ').split(' ').map(word => {
    // Keep certain words in uppercase
    if (word.toLowerCase() === 'ccc' || word.toLowerCase() === 'fis') {
      return word.toUpperCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};

// Helper function to determine completed steps from status history  
const getCompletedStepsFromHistory = (statusHistory: any[], currentStatus: string) => {
  if (!statusHistory || statusHistory.length === 0) return [];
  
  const completedSteps = [];
  
  // Process each status history entry to find completed steps
  for (let i = 0; i < statusHistory.length; i++) {
    const historyItem = statusHistory[i];
    
    // Map each recorded status to the step that was completed to reach it
    let completedStep = '';
    switch (historyItem.status) {
      case 'awaiting_primary_approval':
        completedStep = 'ccc_review'; // CCC Review was completed to reach Primary Approval
        break;
      case 'fis_entry_pending':
        completedStep = 'awaiting_primary_approval'; // Primary Approval was completed to reach FIS Entry
        break;
      case 'completed':
        completedStep = 'fis_entry_pending'; // FIS Entry was completed to reach Completed
        break;
      case 'ccc_review':
      default:
        continue; // Skip ccc_review transitions (submission) and unknown statuses
    }
    
    completedSteps.push({
      ...historyItem,
      displayStatus: completedStep
    });
  }
  
  return completedSteps;
};

// Application details modal
const ApplicationDetailsModal: React.FC<{
  application: Application;
  onClose: () => void;
  onDownloadCV: (application: Application) => void;
  onEdit: (application: Application) => void;
  onStatusUpdate: (updatedApplication: Application) => void;
}> = ({ application, onClose, onDownloadCV, onEdit, onStatusUpdate }) => {
  const [showConfirmApproval, setShowConfirmApproval] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const getNextStatus = (currentStatus: ApplicationStatus): ApplicationStatus | null => {
    switch (currentStatus) {
      case 'submitted':
        return 'ccc_review';
      case 'ccc_review':
        return 'ccc_associate_dean_review';
      case 'ccc_associate_dean_review':
        return 'awaiting_primary_approval';
      case 'awaiting_primary_approval':
        return 'fis_entry_pending';
      case 'fis_entry_pending':
        return 'completed';
      case 'completed':
      case 'rejected':
        return null;
      default:
        return null;
    }
  };

  const handleManualApproval = async () => {
    const nextStatus = getNextStatus(application.status);
    if (!nextStatus) {
      alert('Application is already at final status and cannot be advanced further.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      // Special case: Use the dedicated endpoint for advancing to CCC Associate Dean Review
      if (application.status === 'ccc_review' && nextStatus === 'ccc_associate_dean_review') {
        const response = await fetch(`http://localhost:3001/api/applications/${application.id}/advance-to-associate-dean`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            notes: 'Advanced to CCC Associate Dean Review by CCC Admin'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const updatedApplication = {
          ...result.application,
          submittedAt: new Date(result.application.submittedAt),
          updatedAt: new Date(result.application.updatedAt),
          statusHistory: result.application.statusHistory?.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          })) || []
        };
        onStatusUpdate(updatedApplication);
      } else {
        // Use regular status update for other transitions
        await applicationApi.updateStatus(
          application.id,
          nextStatus,
          'Manually approved by CCC Admin',
          'CCC Admin'
        );
        
        // Fetch the updated application with fresh status history
        const response = await applicationApi.getById(application.id);
        const updatedApplication = {
          ...response.data,
          submittedAt: new Date(response.data.submittedAt),
          updatedAt: new Date(response.data.updatedAt),
          statusHistory: response.data.statusHistory?.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          })) || []
        };
        onStatusUpdate(updatedApplication);
      }
      
      setShowConfirmApproval(false);
      alert('Application status updated successfully!');
    } catch (error: any) {
      console.error('Failed to update application status:', error);
      alert(`Failed to update application status: ${error.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-medium text-gray-900">Application Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Faculty Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-3">Faculty Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-sm text-gray-900">{application.facultyMember.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{application.facultyMember.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="text-sm text-gray-900">{application.facultyMember.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Institution</label>
                <p className="text-sm text-gray-900">
                  {application.facultyMember.institution === 'vanderbilt' ? 'Vanderbilt University' : 'Vanderbilt University Medical Center'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">College</label>
                <p className="text-sm text-gray-900">{application.facultyMember.college}</p>
              </div>
              {application.facultyMember.department && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="text-sm text-gray-900">{application.facultyMember.department}</p>
                </div>
              )}
            </div>
          </div>

          {/* Application Progress */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Application Progress</h4>
            <ApplicationProgress status={application.status} />
            {application.currentApprover && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Current Approver:</strong> {application.currentApprover}
                </p>
              </div>
            )}
            
            {/* Manual Approval Button */}
            {getNextStatus(application.status) && (
              <div className="mt-4 ml-10">
                <button
                  onClick={() => setShowConfirmApproval(true)}
                  disabled={isUpdatingStatus}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-red-400 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Approve Current Step Manually'}
                </button>
              </div>
            )}
          </div>

          {/* Application Questions */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Application Responses</h4>
            <div className="space-y-4">
              {application.contributionsQuestion && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    What specific contributions do you expect to make to the College of Connected Computing through this secondary appointment?
                  </h5>
                  <p className="text-sm text-gray-700">{application.contributionsQuestion}</p>
                </div>
              )}
              
              {application.alignmentQuestion && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    How does your research, teaching, or service align with the interdisciplinary mission of the College of Connected Computing?
                  </h5>
                  <p className="text-sm text-gray-700">{application.alignmentQuestion}</p>
                </div>
              )}
              
              {application.enhancementQuestion && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    How will this secondary appointment enhance your primary academic work and benefit both your home department and the College of Connected Computing?
                  </h5>
                  <p className="text-sm text-gray-700">{application.enhancementQuestion}</p>
                </div>
              )}
              
              {/* Fallback to old rationale field for backward compatibility */}
              {!application.contributionsQuestion && !application.alignmentQuestion && !application.enhancementQuestion && application.rationale && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    Rationale (Legacy Format)
                  </h5>
                  <p className="text-sm text-gray-700">{application.rationale}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Information */}
          {(application.primaryAppointmentEndDate || application.fisEntered !== undefined) && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Administrative Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Appointment End Date</label>
                  <p className="text-sm text-gray-900">
                    {application.primaryAppointmentEndDate instanceof Date 
                      ? application.primaryAppointmentEndDate.toLocaleDateString() 
                      : application.primaryAppointmentEndDate ? new Date(application.primaryAppointmentEndDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">FIS Entered</label>
                  <p className="text-sm text-gray-900">
                    {application.fisEntered ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status History */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Status History</h4>
            <div className="space-y-3">
              {(() => {
                const completedSteps = getCompletedStepsFromHistory(application.statusHistory, application.status);
                
                return completedSteps.length > 0 ? (
                  completedSteps.map((history, index) => (
                    <div key={index} className="border-l-4 border-primary-500 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatStatusName(history.displayStatus)}
                          </p>
                          {history.approver && (
                            <p className="text-sm text-gray-600">by {history.approver}</p>
                          )}
                          {history.notes && (
                            <p className="text-sm text-gray-500 mt-1">{history.notes}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {history.timestamp instanceof Date 
                            ? history.timestamp.toLocaleString() 
                            : new Date(history.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">No status history available</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Status changes will appear here as the application progresses
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              onClick={() => onDownloadCV(application)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CV
            </button>
            <button
              onClick={() => onEdit(application)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmApproval && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-60">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900 mt-2">Confirm Manual Approval</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to manually approve this application and advance it to the next step?
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Current Status: <strong>{formatStatusName(application.status)}</strong>
                  <br />
                  Next Status: <strong>{getNextStatus(application.status) ? formatStatusName(getNextStatus(application.status)!) : ''}</strong>
                </p>
              </div>
              <div className="items-center px-4 py-3 space-x-4">
                <button
                  onClick={() => setShowConfirmApproval(false)}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-700 disabled:opacity-50"
                >
                  No, Cancel
                </button>
                <button
                  onClick={handleManualApproval}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Approving...' : 'Yes, Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Current Applications Tab Component
const CurrentApplicationsTab: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'submittedAt' | 'updatedAt' | 'status'>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);

  // Initialize applications data from API
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await applicationApi.getAll();
        // Convert date strings to Date objects
        const applicationsWithDates = response.data.map(app => ({
          ...app,
          submittedAt: new Date(app.submittedAt),
          updatedAt: new Date(app.updatedAt),
          statusHistory: app.statusHistory?.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          })) || []
        }));
        console.log('Loaded applications from API:', applicationsWithDates.map(app => ({ id: app.id, name: app.facultyMember.name })));
        const ids = applicationsWithDates.map(app => app.id);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          console.warn('Found duplicate application IDs:', duplicateIds);
        }
        setApplications(applicationsWithDates);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
        setApplications([]);
      }
    };

    fetchApplications();
  }, []);

  // Filter and sort applications
  useEffect(() => {
    let filtered = applications;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(app => app.status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.facultyMember.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.facultyMember.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.facultyMember.college.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort applications
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'submittedAt':
          aValue = a.submittedAt instanceof Date ? a.submittedAt.getTime() : new Date(a.submittedAt).getTime();
          bValue = b.submittedAt instanceof Date ? b.submittedAt.getTime() : new Date(b.submittedAt).getTime();
          break;
        case 'updatedAt':
          aValue = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
          bValue = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.submittedAt instanceof Date ? a.submittedAt.getTime() : new Date(a.submittedAt).getTime();
          bValue = b.submittedAt instanceof Date ? b.submittedAt.getTime() : new Date(b.submittedAt).getTime();
      }

      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : 1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    setFilteredApplications(filtered);
  }, [applications, selectedStatus, searchTerm, sortBy, sortOrder]);

  const getStatusBadge = (status: ApplicationStatus) => {
    const statusConfig = {
      'submitted': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Submitted' },
      'ccc_review': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'CCC Review' },
      'ccc_associate_dean_review': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'CCC Associate Dean Review' },
      'awaiting_primary_approval': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Awaiting Approval' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      'fis_entry_pending': { bg: 'bg-green-100', text: 'text-green-800', label: 'FIS Entry Pending' },
      'completed': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' },
      // Legacy statuses for backward compatibility
      'faculty_vote': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Legacy: Faculty Vote' },
      'approved': { bg: 'bg-green-100', text: 'text-green-800', label: 'Legacy: Approved' }
    };

    const config = statusConfig[status] || { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800', 
      label: `Unknown: ${status}` 
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handleSort = (field: 'submittedAt' | 'updatedAt' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDownloadCV = async (application: Application) => {
    try {
      await applicationApi.downloadCV(application.id);
    } catch (error) {
      console.error('Failed to download CV:', error);
      alert('Failed to download CV file. Please try again.');
    }
  };

  const handleSaveApplication = async (updatedApplication: Application) => {
    try {
      // Prepare the data for the API call
      const updateData = {
        // Admin fields
        fisEntered: updatedApplication.fisEntered,
        processingTimeWeeks: updatedApplication.processingTimeWeeks != null && String(updatedApplication.processingTimeWeeks) !== '' ? Number(updatedApplication.processingTimeWeeks) : undefined,
        primaryAppointmentEndDate: updatedApplication.primaryAppointmentEndDate 
          ? (updatedApplication.primaryAppointmentEndDate instanceof Date 
              ? updatedApplication.primaryAppointmentEndDate.toISOString().split('T')[0]
              : updatedApplication.primaryAppointmentEndDate)
          : null,
        
        // Application fields
        status: updatedApplication.status,
        currentApprover: updatedApplication.currentApprover,
        
        // Question fields
        contributionsQuestion: updatedApplication.contributionsQuestion,
        alignmentQuestion: updatedApplication.alignmentQuestion,
        enhancementQuestion: updatedApplication.enhancementQuestion,
        
        // Faculty member fields
        facultyMember: {
          name: updatedApplication.facultyMember.name,
          email: updatedApplication.facultyMember.email,
          title: updatedApplication.facultyMember.title,
          college: updatedApplication.facultyMember.college,
          department: updatedApplication.facultyMember.department,
          institution: updatedApplication.facultyMember.institution
        }
      };

      const response = await fetch(`http://localhost:3001/api/applications/${updatedApplication.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.error || 'Failed to update application';
        if (errorData.details && Array.isArray(errorData.details)) {
          const validationErrors = errorData.details.map((detail: any) => `${detail.param}: ${detail.msg}`).join('\n');
          errorMessage += '\n\nValidation Details:\n' + validationErrors;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Server response after update:', result);
      
      // Update local state with the response data
      console.log('Updating application with ID:', updatedApplication.id);
      setApplications(prev => {
        const updated = prev.map(app => {
          if (app.id === updatedApplication.id) {
            console.log('Found matching application to update:', app.id);
            return { ...app, ...updatedApplication, ...result.data };
          }
          return app;
        });
        return updated;
      });
      
      setEditingApplication(null);
      
      // Show success message (you might want to add a toast notification here)
      console.log('Application updated successfully');
      
    } catch (error) {
      console.error('Error saving application:', error);
      // Show error message (you might want to add error handling UI here)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save application: ${errorMessage}`);
    }
  };

  const handleStatusUpdate = (updatedApplication: Application) => {
    setApplications(prev => prev.map(app => 
      app.id === updatedApplication.id ? updatedApplication : app
    ));
  };

  const statusOptions: { value: ApplicationStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'ccc_review', label: 'CCC Review' },
    { value: 'awaiting_primary_approval', label: 'Awaiting Approval' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'fis_entry_pending', label: 'FIS Entry Pending' },
    { value: 'completed', label: 'Completed' }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Current Applications</h3>
          <p className="text-sm text-gray-600">
            Showing {filteredApplications.length} of {applications.length} applications
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4 md:space-y-0 md:flex md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name, email, ID, or college..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        <div className="flex space-x-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ApplicationStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Application ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Faculty Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Status</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('submittedAt')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Submitted</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('updatedAt')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Last Updated</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredApplications.map((application) => (
              <tr key={application.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{application.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {application.facultyMember.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {application.facultyMember.email}
                      </div>
                      <div className="text-xs text-gray-400">
                        {application.facultyMember.college}
                        {application.facultyMember.department && ` • ${application.facultyMember.department}`}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(application.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {application.submittedAt instanceof Date 
                    ? application.submittedAt.toLocaleDateString() 
                    : new Date(application.submittedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {application.updatedAt instanceof Date 
                    ? application.updatedAt.toLocaleDateString() 
                    : new Date(application.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setSelectedApplication(application)}
                    className="text-primary-600 hover:text-primary-900"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadCV(application)}
                    className="text-green-600 hover:text-green-900"
                    title="Download CV"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredApplications.length === 0 && (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No applications have been submitted yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Application Edit Modal */}
      {editingApplication && (
        <ApplicationEditModal
          application={editingApplication}
          onClose={() => setEditingApplication(null)}
          onSave={handleSaveApplication}
        />
      )}

      {/* Application Details Modal */}
      {selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onDownloadCV={handleDownloadCV}
          onEdit={(app) => {
            setEditingApplication(app);
            setSelectedApplication(null);
          }}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

interface CollegeFormProps {
  college?: College;
  onSave: (college: Omit<College, 'id'>) => void;
  onCancel: () => void;
}

const CollegeForm: React.FC<CollegeFormProps> = ({ college, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: college?.name || '',
    hasDepartments: college?.hasDepartments ?? true,
    deanName: college?.dean.name || '',
    deanEmail: college?.dean.email || '',
    deanTitle: college?.dean.title || 'Dean',
    seniorAssociateDeanName: college?.seniorAssociateDean?.name || '',
    seniorAssociateDeanEmail: college?.seniorAssociateDean?.email || '',
    seniorAssociateDeanTitle: college?.seniorAssociateDean?.title || 'Senior Associate Dean'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'College name is required';
    if (!formData.deanName.trim()) newErrors.deanName = 'Dean name is required';
    if (!formData.deanEmail.trim()) newErrors.deanEmail = 'Dean email is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.deanEmail && !emailRegex.test(formData.deanEmail)) {
      newErrors.deanEmail = 'Invalid email format';
    }
    
    if (formData.seniorAssociateDeanEmail && !emailRegex.test(formData.seniorAssociateDeanEmail)) {
      newErrors.seniorAssociateDeanEmail = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const collegeData: Omit<College, 'id'> = {
      name: formData.name,
      hasDepartments: formData.hasDepartments,
      dean: {
        name: formData.deanName,
        email: formData.deanEmail,
        title: formData.deanTitle
      },
      requiredApprovers: ['dean'] // Default approver requirement
    };

    if (formData.seniorAssociateDeanName && formData.seniorAssociateDeanEmail) {
      collegeData.seniorAssociateDean = {
        name: formData.seniorAssociateDeanName,
        email: formData.seniorAssociateDeanEmail,
        title: formData.seniorAssociateDeanTitle
      };
    }

    onSave(collegeData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          College Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="School of Engineering"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.hasDepartments}
            onChange={(e) => setFormData(prev => ({ ...prev, hasDepartments: e.target.checked }))}
            className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          />
          <span className="ml-2 text-sm text-gray-700">
            College has departments with chairs
          </span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Uncheck this for colleges like Owen, Blair, Nursing, and Divinity that route directly to the dean
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dean Name *
          </label>
          <input
            type="text"
            value={formData.deanName}
            onChange={(e) => setFormData(prev => ({ ...prev, deanName: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
              errors.deanName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Dr. Dean"
          />
          {errors.deanName && <p className="mt-1 text-sm text-red-600">{errors.deanName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dean Email *
          </label>
          <input
            type="email"
            value={formData.deanEmail}
            onChange={(e) => setFormData(prev => ({ ...prev, deanEmail: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
              errors.deanEmail ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="jane.smith@vanderbilt.edu"
          />
          {errors.deanEmail && <p className="mt-1 text-sm text-red-600">{errors.deanEmail}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dean Title
          </label>
          <input
            type="text"
            value={formData.deanTitle}
            onChange={(e) => setFormData(prev => ({ ...prev, deanTitle: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            placeholder="Dean"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">Senior Associate Dean (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.seniorAssociateDeanName}
              onChange={(e) => setFormData(prev => ({ ...prev, seniorAssociateDeanName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Dr. John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.seniorAssociateDeanEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, seniorAssociateDeanEmail: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                errors.seniorAssociateDeanEmail ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="john.doe@vanderbilt.edu"
            />
            {errors.seniorAssociateDeanEmail && <p className="mt-1 text-sm text-red-600">{errors.seniorAssociateDeanEmail}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.seniorAssociateDeanTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, seniorAssociateDeanTitle: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Senior Associate Dean"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <X className="inline mr-1 h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <Save className="inline mr-1 h-4 w-4" />
          Save College
        </button>
      </div>
    </form>
  );
};

const CollegesTab: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Mock data initialization
  useEffect(() => {
    const mockColleges: College[] = [
      {
        id: '1',
        name: 'School of Engineering',
        hasDepartments: true,
        dean: { name: 'Dr. Patricia Williams', email: 'patricia.williams@vanderbilt.edu', title: 'Dean' },
        requiredApprovers: ['departmentChair', 'dean']
      },
      {
        id: '2',
        name: 'Owen Graduate School of Management',
        hasDepartments: false,
        dean: { name: 'Dr. Eric Johnson', email: 'eric.johnson@vanderbilt.edu', title: 'Dean' },
        requiredApprovers: ['associateDean', 'dean']
      }
    ];
    setColleges(mockColleges);
  }, []);

  const handleSaveCollege = (collegeData: Omit<College, 'id'>) => {
    if (editingCollege) {
      setColleges(prev => prev.map(c => c.id === editingCollege.id ? { ...collegeData, id: editingCollege.id } : c));
      setEditingCollege(null);
    } else {
      const newCollege: College = { ...collegeData, id: Date.now().toString() };
      setColleges(prev => [...prev, newCollege]);
      setIsCreating(false);
    }
  };

  const handleDeleteCollege = (id: string) => {
    setColleges(prev => prev.filter(c => c.id !== id));
    setShowDeleteConfirm(null);
  };

  if (isCreating || editingCollege) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {editingCollege ? 'Edit College' : 'Add New College'}
          </h3>
          <p className="text-sm text-gray-600">
            Configure college information and approval chain details
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <CollegeForm
            college={editingCollege || undefined}
            onSave={handleSaveCollege}
            onCancel={() => {
              setEditingCollege(null);
              setIsCreating(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Colleges & Approval Chains</h3>
          <p className="text-sm text-gray-600">Manage college information and approval workflows</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add College
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                College
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Has Departments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dean
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {colleges.map((college) => (
              <tr key={college.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{college.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    college.hasDepartments ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {college.hasDepartments ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{college.dean.name}</div>
                  <div className="text-sm text-gray-500">{college.dean.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setEditingCollege(college)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(college.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete College</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this college? This action cannot be undone.
                </p>
              </div>
              <div className="items-center px-4 py-3 space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteCollege(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SystemSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState({
    processingTargetDays: 14,
    fisIntegration: true,
    oracleApiEndpoint: 'https://api.vanderbilt.edu/oracle/org-chart',
    facultyVotingEnabled: false,
    cccAssociateDeanEmail: 'associate.dean.ccc@vanderbilt.edu'
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsApi.getSettings();
      const dbSettings = response.data;
      
      // Map database settings to local state
      setSettings({
        processingTargetDays: parseInt(dbSettings.processing_time_goal_weeks?.value || '2') * 7,
        fisIntegration: true, // This could be mapped from a DB setting if needed
        oracleApiEndpoint: 'https://api.vanderbilt.edu/oracle/org-chart', // This could be mapped from a DB setting if needed
        facultyVotingEnabled: dbSettings.enable_faculty_vote?.value === 'true',
        cccAssociateDeanEmail: dbSettings.ccc_associate_dean_email?.value || 'associate.dean.ccc@vanderbilt.edu'
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      // For now, we'll only update the CCC Associate Dean email setting
      // Other settings can be added to the backend settings system as needed
      await updateCCCAssociateDeanEmail(settings.cccAssociateDeanEmail);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateCCCAssociateDeanEmail = async (email: string) => {
    await settingsApi.updateSetting('ccc_associate_dean_email', email);
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
        <p className="text-sm text-gray-600">Configure workflow automation and system integration settings</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Workflow Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Processing Target (days)
              </label>
              <input
                type="number"
                value={settings.processingTargetDays}
                onChange={(e) => setSettings(prev => ({ ...prev, processingTargetDays: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                min="1"
                max="90"
              />
              <p className="mt-1 text-xs text-gray-500">Target processing time for applications</p>
            </div> */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CCC Associate Dean Email
              </label>
              <div className="flex space-x-3">
                <input
                  type="email"
                  value={settings.cccAssociateDeanEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, cccAssociateDeanEmail: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="associate.dean.ccc@vanderbilt.edu"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Change Email'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Email for CCC Associate Dean approval notifications</p>
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
              {saved && <p className="mt-1 text-xs text-green-600">Email updated successfully!</p>}
            </div>
          </div>
        </div>

        {/* <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Integration Settings</h4>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.fisIntegration}
                onChange={(e) => setSettings(prev => ({ ...prev, fisIntegration: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Enable FIS (Faculty Information System) integration
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Oracle API Endpoint
              </label>
              <input
                type="url"
                value={settings.oracleApiEndpoint}
                onChange={(e) => setSettings(prev => ({ ...prev, oracleApiEndpoint: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://api.vanderbilt.edu/oracle/org-chart"
              />
              <p className="mt-1 text-xs text-gray-500">
                Endpoint for organizational chart data (quarterly refresh)
              </p>
            </div>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.facultyVotingEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, facultyVotingEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Enable faculty voting step (currently bypassed for new college)
              </span>
            </label>
          </div>
        </div> */}

      </div>
    </div>
  );
};

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('applications');

  const tabs = [
    { id: 'applications', label: 'Current Applications', icon: FileText },
    { id: 'colleges', label: 'Colleges', icon: Building2 },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600">Manage system configuration and approval workflows</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
        </div>
        
        <div className="px-6 py-6">
          {activeTab === 'applications' && <CurrentApplicationsTab />}
          {activeTab === 'colleges' && <CollegesTab />}
          {activeTab === 'settings' && <SystemSettingsTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;