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
  CheckCircle,
  FileText,
  Download,
  Eye,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { College, ContactInfo, Application, ApplicationStatus } from '../types';
import { mockApplications, generateMockApplications } from '../utils/mockData';

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
    { key: 'faculty_vote', label: 'Faculty Vote' },
    { key: 'awaiting_primary_approval', label: 'Primary Approval' },
    { key: 'approved', label: 'Approved' },
    { key: 'fis_entry_pending', label: 'FIS Entry' },
    { key: 'completed', label: 'Completed' }
  ];

  const statusOrder = {
    'submitted': 0,
    'ccc_review': 1,
    'faculty_vote': 2,
    'awaiting_primary_approval': 3,
    'approved': 4,
    'rejected': -1,
    'fis_entry_pending': 5,
    'completed': 6
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

// Application details modal
const ApplicationDetailsModal: React.FC<{
  application: Application;
  onClose: () => void;
  onDownloadCV: (application: Application) => void;
}> = ({ application, onClose, onDownloadCV }) => {
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
          </div>

          {/* Rationale */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Rationale</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">{application.rationale}</p>
            </div>
          </div>

          {/* Status History */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Status History</h4>
            <div className="space-y-3">
              {application.statusHistory.map((history, index) => (
                <div key={index} className="border-l-4 border-primary-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {history.status.replace('_', ' ')}
                      </p>
                      {history.approver && (
                        <p className="text-sm text-gray-600">by {history.approver}</p>
                      )}
                      {history.notes && (
                        <p className="text-sm text-gray-500 mt-1">{history.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {history.timestamp.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
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
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
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

  // Initialize applications data
  useEffect(() => {
    // Combine mock applications with generated ones for demonstration
    const allApplications = [...mockApplications, ...generateMockApplications(20)];
    setApplications(allApplications);
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
          aValue = a.submittedAt.getTime();
          bValue = b.submittedAt.getTime();
          break;
        case 'updatedAt':
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.submittedAt.getTime();
          bValue = b.submittedAt.getTime();
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
      'faculty_vote': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Faculty Vote' },
      'awaiting_primary_approval': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Awaiting Approval' },
      'approved': { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      'fis_entry_pending': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'FIS Entry Pending' },
      'completed': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' }
    };

    const config = statusConfig[status];
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

  const handleDownloadCV = (application: Application) => {
    // Mock CV download functionality
    const blob = new Blob([`CV for ${application.facultyMember.name}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${application.facultyMember.name}_CV.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusOptions: { value: ApplicationStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'ccc_review', label: 'CCC Review' },
    { value: 'faculty_vote', label: 'Faculty Vote' },
    { value: 'awaiting_primary_approval', label: 'Awaiting Approval' },
    { value: 'approved', label: 'Approved' },
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
                  {application.submittedAt.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {application.updatedAt.toLocaleDateString()}
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
      }
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
            placeholder="Dr. Jane Smith"
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
        dean: { name: 'Dr. Patricia Williams', email: 'patricia.williams@vanderbilt.edu', title: 'Dean' }
      },
      {
        id: '2',
        name: 'Owen Graduate School of Management',
        hasDepartments: false,
        dean: { name: 'Dr. Eric Johnson', email: 'eric.johnson@vanderbilt.edu', title: 'Dean' }
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
    reminderInterval: 7,
    processingTargetDays: 14,
    autoReminders: true,
    emailNotifications: true,
    fisIntegration: true,
    oracleApiEndpoint: 'https://api.vanderbilt.edu/oracle/org-chart',
    facultyVotingEnabled: false
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Simulate save operation
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
        <p className="text-sm text-gray-600">Configure workflow automation and notification settings</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Workflow Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Interval (days)
              </label>
              <input
                type="number"
                value={settings.reminderInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, reminderInterval: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                min="1"
                max="30"
              />
              <p className="mt-1 text-xs text-gray-500">Days before sending stall reminder emails</p>
            </div>

            <div>
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
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Notification Settings</h4>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoReminders}
                onChange={(e) => setSettings(prev => ({ ...prev, autoReminders: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Enable automatic reminder emails
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Enable email notifications for status updates
              </span>
            </label>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
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
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              saved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {saved ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
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