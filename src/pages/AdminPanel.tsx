import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Edit,
  X,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Search,
  ArrowUpDown,
  Mail
} from 'lucide-react';
import { Application, ApplicationStatus } from '../types';
import { applicationApi, settingsApi } from '../utils/api';
import CVPreview from '../components/CVPreview';

// Helper function to format date for display without timezone issues
const formatDateForDisplay = (date: Date | string | undefined): string => {
  if (!date) return 'Not set';
  
  if (typeof date === 'string') {
    try {
      // If it's a string, parse it as local date to avoid timezone issues
      const dateStr = date.includes('T') ? date.split('T')[0] : date;
      const [year, month, day] = dateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString();
    } catch (error) {
      console.warn('Error parsing date string:', date, error);
      return 'Invalid date';
    }
  }
  
  if (date instanceof Date) {
    return date.toLocaleDateString();
  }
  
  return 'Not set';
};

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
const getCompletedStepsFromHistory = (statusHistory: any[], currentStatus: string, application?: any) => {
  if (!statusHistory || statusHistory.length === 0) return [];
  
  // Filter out entries with no meaningful content (no notes and no approver)
  const meaningfulEntries = statusHistory.filter(entry => 
    entry.notes || entry.approver
  );
  
  // Create completed steps based on what status transitions occurred
  const completedSteps: any[] = [];
  
  // Track all statuses that have been reached (including current status)
  const statusesReached = [...meaningfulEntries.map(entry => entry.status), currentStatus];
  
  // Always start with submitted if there are any history entries
  if (meaningfulEntries.length > 0) {
    const firstEntry = meaningfulEntries[0];
    completedSteps.push({
      ...firstEntry,
      displayStatus: 'submitted'
    });
  }
  
  // Add CCC Review step if we've progressed beyond ccc_review status
  if (statusesReached.includes('ccc_associate_dean_review') || 
      statusesReached.includes('awaiting_primary_approval') || 
      statusesReached.includes('fis_entry_pending') || 
      statusesReached.includes('completed')) {
    
    // Find the entry where CCC review was completed (when status changed to ccc_associate_dean_review)
    const cccReviewEntry = meaningfulEntries.find(entry => entry.status === 'ccc_associate_dean_review');
    if (cccReviewEntry) {
      completedSteps.push({
        ...cccReviewEntry,
        displayStatus: 'ccc_review'
      });
    }
  }
  
  // Add CCC Associate Dean Review step ONLY if we've progressed beyond that status
  // (i.e., only if we've moved to awaiting_primary_approval or later)
  if (statusesReached.includes('awaiting_primary_approval') || 
      statusesReached.includes('fis_entry_pending') || 
      statusesReached.includes('completed')) {
    
    // Find the entry where CCC Associate Dean review was completed
    // Look for the last entry with ccc_associate_dean_review status that has meaningful content
    const associateDeanEntries = meaningfulEntries.filter(entry => entry.status === 'ccc_associate_dean_review');
    const associateDeanEntry = associateDeanEntries[associateDeanEntries.length - 1]; // Get the last one
    if (associateDeanEntry) {
      completedSteps.push({
        ...associateDeanEntry,
        displayStatus: 'ccc_associate_dean_review'
      });
    }
  }
  
  // Add individual Primary Approval steps based on actual approver completions
  // Look for entries during awaiting_primary_approval that have specific approver roles
  meaningfulEntries.forEach(entry => {
    if (entry.status === 'awaiting_primary_approval' && entry.approver && entry.approver_token) {
      // Extract role from approver string (format: "Name (role)")
      const roleMatch = entry.approver.match(/\(([^)]+)\)$/);
      const role = roleMatch ? roleMatch[1] : '';
      
      // Map database roles to display labels
      const roleDisplayMap: Record<string, string> = {
        'department_chair': application?.facultyMember?.institution === 'vumc' ? 'Primary Chair Approval' : 'Department Chair Approval',
        'division_chair': 'Division Leader Approval', 
        'senior_associate_dean': 'Associate Dean Approval',
        'dean': 'Dean Approval'
      };
      
      const customLabel = roleDisplayMap[role] || entry.approver;
      
      completedSteps.push({
        ...entry,
        displayStatus: `primary_approval_${role}`,
        customLabel: customLabel
      });
    }
  });

  // Add FIS Entry step if the application has been completed (showing FIS Entry was done)
  if (statusesReached.includes('completed')) {
    // Find the entry where application moved to completed status (FIS Entry was completed)
    const completedEntry = meaningfulEntries.find(entry => entry.status === 'completed');
    if (completedEntry) {
      completedSteps.push({
        ...completedEntry,
        displayStatus: 'fis_entry_completed',
        approver: 'CCC Staff (FIS Entry)',
        customLabel: 'FIS Entry'
      });
    }
  }

  // Don't add current status as completed - only show truly completed steps
  // Current status represents work in progress, not completed work
  
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
  const [showConfirmReject, setShowConfirmReject] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

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

  const getCurrentApprover = (application: Application): string | null => {
    const { status } = application;

    switch (status) {
      case 'submitted':
        return 'CCC Faculty';
      
      case 'ccc_review':
        return 'CCC Faculty';
      
      case 'ccc_associate_dean_review':
        return 'CCC Associate Dean';
      
      case 'awaiting_primary_approval':
        // Use college-specific configuration to determine approver order
        const getCollegeRequirements = (college: string) => {
          const colleges: Record<string, { hasDepartments: boolean; requiredApprovers: string[] }> = {
            'School of Engineering': {
              hasDepartments: true,
              requiredApprovers: ['departmentChair', 'dean']
            },
            'College of Arts & Science': {
              hasDepartments: true,
              requiredApprovers: ['departmentChair', 'associateDean']
            },
            'School of Medicine - Basic Sciences': {
              hasDepartments: true,
              requiredApprovers: ['departmentChair']
            },
            'Owen Graduate School of Management': {
              hasDepartments: false,
              requiredApprovers: ['associateDean', 'dean']
            },
            'Blair School of Music': {
              hasDepartments: false,
              requiredApprovers: ['associateDean', 'dean']
            },
            'School of Nursing': {
              hasDepartments: false,
              requiredApprovers: ['dean']
            },
            'Law School': {
              hasDepartments: false,
              requiredApprovers: ['viceDean']
            }
          };
          return colleges[college] || { hasDepartments: false, requiredApprovers: [] };
        };

        const collegeConfig = getCollegeRequirements(application.facultyMember.college);
        const approvedBy = application.statusHistory?.map(h => h.approver?.toLowerCase()) || [];
        
        // Build approver chain based on college configuration order
        const approverChain = [];
        for (const approverType of collegeConfig.requiredApprovers) {
          switch (approverType) {
            case 'departmentChair':
              if (application.approvalChain?.departmentChair) {
                approverChain.push({
                  name: application.approvalChain.departmentChair.name,
                  title: application.facultyMember?.institution === 'vumc' ? 'Primary Chair' : 'Department Chair',
                  email: application.approvalChain.departmentChair.email
                });
              }
              break;
            case 'associateDean':
              if (application.approvalChain?.seniorAssociateDean) {
                approverChain.push({
                  name: application.approvalChain.seniorAssociateDean.name,
                  title: 'Associate Dean',
                  email: application.approvalChain.seniorAssociateDean.email
                });
              }
              break;
            case 'dean':
              if (application.approvalChain?.dean) {
                approverChain.push({
                  name: application.approvalChain.dean.name,
                  title: 'Dean',
                  email: application.approvalChain.dean.email
                });
              }
              break;
            case 'viceDean':
              if (application.approvalChain?.dean) {
                approverChain.push({
                  name: application.approvalChain.dean.name,
                  title: 'Vice Dean',
                  email: application.approvalChain.dean.email
                });
              }
              break;
          }
        }
        
        // Find the first approver who hasn't approved yet
        for (const approver of approverChain) {
          const hasApproved = approvedBy.some(approved => 
            approved && (
              approved.includes(approver.name.toLowerCase()) ||
              approved.includes(approver.email.toLowerCase()) ||
              approved.includes(approver.title.toLowerCase())
            )
          );
          if (!hasApproved) {
            return `${approver.title} (${approver.name})`;
          }
        }
        
        // If all have approved or none found, return the last in chain or generic
        return approverChain.length > 0 
          ? `${approverChain[approverChain.length - 1].title} (${approverChain[approverChain.length - 1].name})`
          : 'Primary Approver (Not Specified)';
      
      case 'fis_entry_pending':
        return 'CCC Faculty (FIS Entry)';
      
      case 'completed':
      case 'rejected':
        return null;
      
      default:
        return 'Unknown';
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
      onClose();
    } catch (error: any) {
      console.error('Failed to update application status:', error);
      alert(`Failed to update application status: ${error.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRejectApplication = async () => {
    setIsUpdatingStatus(true);
    try {
      await applicationApi.updateStatus(
        application.id,
        'rejected',
        'Rejected by CCC Admin',
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
      
      setShowConfirmReject(false);
      alert('Application has been rejected successfully.');
      onClose();
    } catch (error: any) {
      console.error('Failed to reject application:', error);
      alert(`Failed to reject application: ${error.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResendingEmail(true);
    try {
      const response = await fetch(`http://localhost:3001/api/applications/${application.id}/resend-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend email notification');
      }

      alert('Email notification resent successfully.');
      onClose();
    } catch (error: any) {
      console.error('Failed to resend email notification:', error);
      alert(`Failed to resend email notification: ${error.message}`);
    } finally {
      setIsResendingEmail(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6 mr-3">
          <h3 className="text-xl font-medium text-gray-900">Application Details</h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onEdit(application)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
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
            {getCurrentApprover(application) && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Current Approver:</strong> {getCurrentApprover(application)}
                </p>
              </div>
            )}
            
            {/* Action Buttons */}
            {(getNextStatus(application.status) || (application.status !== 'completed' && application.status !== 'rejected')) && (
              <div className="mt-4 ml-10 flex space-x-3">
                {getNextStatus(application.status) && (
                  <button
                    onClick={() => setShowConfirmApproval(true)}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingStatus ? 'Updating...' : 'Approve Current Step Manually'}
                  </button>
                )}
                
                {application.status !== 'completed' && application.status !== 'rejected' && (
                  <>
                    <button
                      onClick={() => setShowConfirmReject(true)}
                      disabled={isUpdatingStatus}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="inline mr-1 h-3 w-3" />
                      {isUpdatingStatus ? 'Rejecting...' : 'Reject Application'}
                    </button>
                    
                    <button
                      onClick={handleResendEmail}
                      disabled={isResendingEmail}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Mail className="inline mr-1 h-3 w-3" />
                      {isResendingEmail ? 'Sending...' : 'Resend Email Notification'}
                    </button>
                  </>
                )}
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
          {(application.primaryAppointmentStartDate || application.primaryAppointmentEndDate || application.fisEntered !== undefined) && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Administrative Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Appointment Start Date</label>
                  <p className="text-sm text-gray-900">
                    {formatDateForDisplay(application.primaryAppointmentStartDate)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Appointment End Date</label>
                  <p className="text-sm text-gray-900">
                    {formatDateForDisplay(application.primaryAppointmentEndDate)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Secondary Appointment FIS Entered?</label>
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
                const completedSteps = getCompletedStepsFromHistory(application.statusHistory, application.status, application);
                
                return completedSteps.length > 0 ? (
                  completedSteps.map((history, index) => (
                    <div key={index} className="border-l-4 border-primary-500 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {history.customLabel || formatStatusName(history.displayStatus)}
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
                            ? history.timestamp.toLocaleString('en-US', { timeZone: 'America/Chicago' })
                            : new Date(history.timestamp).toLocaleString('en-US', { timeZone: 'America/Chicago' })}
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

          {/* CV Preview */}
          <div className="mt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-3">Curriculum Vitae</h4>
            <CVPreview 
              applicationId={application.id} 
              fileName={application.cvFileName}
              className="w-full"
            />
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
      
      {/* Rejection Confirmation Modal */}
      {showConfirmReject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-60">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <X className="mx-auto h-12 w-12 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900 mt-2">Confirm Application Rejection</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to reject this application? This action cannot be undone.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Current Status: <strong>{formatStatusName(application.status)}</strong>
                  <br />
                  New Status: <strong>Rejected</strong>
                </p>
              </div>
              <div className="items-center px-4 py-3 space-x-4">
                <button
                  onClick={() => setShowConfirmReject(false)}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-700 disabled:opacity-50"
                >
                  No, Cancel
                </button>
                <button
                  onClick={handleRejectApplication}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Rejecting...' : 'Yes, Reject'}
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
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'submittedAt' | 'updatedAt' | 'status'>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Initialize applications data from API
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await applicationApi.getAll();
        // Convert date strings to Date objects
        const applicationsWithDates = response.data.map(app => ({
          ...app,
          submittedAt: app.submittedAt ? new Date(app.submittedAt) : new Date(),
          updatedAt: app.updatedAt ? new Date(app.updatedAt) : new Date(),
          primaryAppointmentStartDate: app.primaryAppointmentStartDate,
          primaryAppointmentEndDate: app.primaryAppointmentEndDate,
          fisEntryDate: app.fisEntryDate ? new Date(app.fisEntryDate) : null,
          statusHistory: app.statusHistory?.map((item: any) => ({
            ...item,
            timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
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
                    <div className="min-w-0 max-w-xs">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {application.facultyMember.name}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {application.facultyMember.email}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
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


      {/* Application Details Modal */}
      {selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onDownloadCV={handleDownloadCV}
          onEdit={(app) => {
            navigate(`/admin/edit/${app.id}`);
          }}
          onStatusUpdate={handleStatusUpdate}
        />
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

      </div>
    </div>
  );
};

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('applications');

  const tabs = [
    { id: 'applications', label: 'Current Applications', icon: FileText },
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
          {activeTab === 'settings' && <SystemSettingsTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;