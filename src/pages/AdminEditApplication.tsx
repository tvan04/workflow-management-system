import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Save,
  X,
  Users,
  Building2,
  FileText,
  Info,
  CheckCircle
} from 'lucide-react';
import { Application, ApplicationStatus, FacultyMember } from '../types';
import { applicationApi } from '../utils/api';

// Helper function to format date for input without timezone issues
const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  
  if (typeof date === 'string') {
    // If it's already a string, just return it (assuming it's in YYYY-MM-DD format)
    return date.split('T')[0];
  }
  
  if (date instanceof Date) {
    // Use local timezone to avoid day-off issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return '';
};

// Helper function to parse date from input without timezone issues
const parseDateFromInput = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  
  // Parse as local date to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
};

// Helper function to get approvers for an application
const getApproversForApplication = (application: Application) => {
  const approvers = [];
  
  // Check individual approver fields first (direct from API)
  if (application.departmentChairName || application.departmentChairEmail) {
    approvers.push({
      role: 'Department Chair',
      key: 'departmentChair',
      name: application.departmentChairName || '',
      email: application.departmentChairEmail || ''
    });
  }
  
  if (application.divisionChairName || application.divisionChairEmail) {
    approvers.push({
      role: 'Division Chair', 
      key: 'divisionChair',
      name: application.divisionChairName || '',
      email: application.divisionChairEmail || ''
    });
  }
  
  if (application.seniorAssociateDeanName || application.seniorAssociateDeanEmail) {
    approvers.push({
      role: 'Senior Associate Dean',
      key: 'seniorAssociateDean', 
      name: application.seniorAssociateDeanName || '',
      email: application.seniorAssociateDeanEmail || ''
    });
  }
  
  if (application.deanName || application.deanEmail) {
    approvers.push({
      role: 'Dean',
      key: 'dean',
      name: application.deanName || '',
      email: application.deanEmail || ''
    });
  }
  
  // Fallback: check approvalChain if individual fields are not available
  if (approvers.length === 0 && application.approvalChain) {
    const chain = application.approvalChain;
    
    if (chain.departmentChair && (chain.departmentChair.name || chain.departmentChair.email)) {
      approvers.push({
        role: 'Department Chair',
        key: 'departmentChair',
        name: chain.departmentChair.name || '',
        email: chain.departmentChair.email || ''
      });
    }
    
    if (chain.divisionChair && (chain.divisionChair.name || chain.divisionChair.email)) {
      approvers.push({
        role: 'Division Chair', 
        key: 'divisionChair',
        name: chain.divisionChair.name || '',
        email: chain.divisionChair.email || ''
      });
    }
    
    if (chain.seniorAssociateDean && (chain.seniorAssociateDean.name || chain.seniorAssociateDean.email)) {
      approvers.push({
        role: 'Senior Associate Dean',
        key: 'seniorAssociateDean', 
        name: chain.seniorAssociateDean.name || '',
        email: chain.seniorAssociateDean.email || ''
      });
    }
    
    if (chain.dean && (chain.dean.name || chain.dean.email)) {
      approvers.push({
        role: 'Dean',
        key: 'dean',
        name: chain.dean.name || '',
        email: chain.dean.email || ''
      });
    }
  }
  
  return approvers;
};

const AdminEditApplication: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  
  const [application, setApplication] = useState<Application | null>(null);
  const [formData, setFormData] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    const fetchApplication = async () => {
      if (!applicationId) return;
      
      try {
        setLoading(true);
        const response = await applicationApi.getById(applicationId);
        const app = {
          ...response.data,
          submittedAt: new Date(response.data.submittedAt),
          updatedAt: new Date(response.data.updatedAt),
          primaryAppointmentStartDate: response.data.primaryAppointmentStartDate 
            ? parseDateFromInput(response.data.primaryAppointmentStartDate.split('T')[0]) 
            : undefined,
          primaryAppointmentEndDate: response.data.primaryAppointmentEndDate 
            ? parseDateFromInput(response.data.primaryAppointmentEndDate.split('T')[0]) 
            : undefined,
          statusHistory: response.data.statusHistory?.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          })) || []
        };
        
        // Populate individual approver fields from approvalChain if they're not already present
        if (response.data.approvalChain) {
          const chain = response.data.approvalChain;
          
          // Only set if individual fields are not already present
          if (!app.departmentChairName && !app.departmentChairEmail && chain.departmentChair) {
            app.departmentChairName = chain.departmentChair.name || '';
            app.departmentChairEmail = chain.departmentChair.email || '';
          }
          
          if (!app.divisionChairName && !app.divisionChairEmail && chain.divisionChair) {
            app.divisionChairName = chain.divisionChair.name || '';
            app.divisionChairEmail = chain.divisionChair.email || '';
          }
          
          if (!app.deanName && !app.deanEmail && chain.dean) {
            app.deanName = chain.dean.name || '';
            app.deanEmail = chain.dean.email || '';
          }
          
          if (!app.seniorAssociateDeanName && !app.seniorAssociateDeanEmail && chain.seniorAssociateDean) {
            app.seniorAssociateDeanName = chain.seniorAssociateDean.name || '';
            app.seniorAssociateDeanEmail = chain.seniorAssociateDean.email || '';
          }
        }
        setApplication(app);
        setFormData(app);
      } catch (error) {
        console.error('Failed to fetch application:', error);
        alert('Failed to load application. Please try again.');
        navigate('/admin');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId, navigate]);

  const handleInputChange = (field: keyof Application, value: any) => {
    if (!formData) return;
    
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
    
    // Clear error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFacultyChange = (field: keyof FacultyMember, value: string) => {
    if (!formData) return;
    
    setFormData(prev => prev ? ({
      ...prev,
      facultyMember: { ...prev.facultyMember, [field]: value }
    }) : null);
  };

  const handleApproverChange = (approverKey: string, field: 'name' | 'email', value: string) => {
    if (!formData) return;
    
    setFormData(prev => {
      if (!prev) return null;
      
      // Update the appropriate approver field based on the key
      const updates: any = {};
      if (approverKey === 'departmentChair') {
        if (field === 'name') {
          updates.departmentChairName = value;
        } else {
          updates.departmentChairEmail = value;
        }
      } else if (approverKey === 'divisionChair') {
        if (field === 'name') {
          updates.divisionChairName = value;
        } else {
          updates.divisionChairEmail = value;
        }
      } else if (approverKey === 'dean') {
        if (field === 'name') {
          updates.deanName = value;
        } else {
          updates.deanEmail = value;
        }
      } else if (approverKey === 'seniorAssociateDean') {
        if (field === 'name') {
          updates.seniorAssociateDeanName = value;
        } else {
          updates.seniorAssociateDeanEmail = value;
        }
      }
      
      return { ...prev, ...updates };
    });
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    if (!formData) return false;
    
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
    
    // Admin-only required fields
    if (!formData.primaryAppointmentStartDate) {
      newErrors.primaryAppointmentStartDate = 'Primary appointment start date is required';
    }
    if (!formData.primaryAppointmentEndDate) {
      newErrors.primaryAppointmentEndDate = 'Primary appointment end date is required';
    }
    
    // Cross-field validation: start date must be before end date
    if (formData.primaryAppointmentStartDate && formData.primaryAppointmentEndDate) {
      const startDate = new Date(formData.primaryAppointmentStartDate);
      const endDate = new Date(formData.primaryAppointmentEndDate);
      if (startDate >= endDate) {
        newErrors.primaryAppointmentStartDate = 'Start date must be before end date';
        newErrors.primaryAppointmentEndDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!formData || !validateForm()) return;

    try {
      setSaving(true);
      
      // Prepare the data for the API call
      const updateData = {
        // Admin fields
        fisEntered: formData.fisEntered,
        processingTimeWeeks: formData.processingTimeWeeks != null && String(formData.processingTimeWeeks) !== '' ? Number(formData.processingTimeWeeks) : undefined,
        primaryAppointmentStartDate: formData.primaryAppointmentStartDate 
          ? formatDateForInput(formData.primaryAppointmentStartDate)
          : null,
        primaryAppointmentEndDate: formData.primaryAppointmentEndDate 
          ? formatDateForInput(formData.primaryAppointmentEndDate)
          : null,
        
        // Application fields (status is read-only now, so we don't update it)
        
        // Question fields
        contributionsQuestion: formData.contributionsQuestion,
        alignmentQuestion: formData.alignmentQuestion,
        enhancementQuestion: formData.enhancementQuestion,
        
        // Faculty member fields
        facultyMember: {
          name: formData.facultyMember.name,
          email: formData.facultyMember.email,
          title: formData.facultyMember.title,
          college: formData.facultyMember.college,
          department: formData.facultyMember.department,
          institution: formData.facultyMember.institution
        },
        
        // Approver fields
        approvers: {
          departmentChair: {
            name: formData.departmentChairName || '',
            email: formData.departmentChairEmail || ''
          },
          divisionChair: {
            name: formData.divisionChairName || '',
            email: formData.divisionChairEmail || ''
          },
          dean: {
            name: formData.deanName || '',
            email: formData.deanEmail || ''
          },
          seniorAssociateDean: {
            name: formData.seniorAssociateDeanName || '',
            email: formData.seniorAssociateDeanEmail || ''
          }
        }
      };

      const response = await fetch(`http://localhost:3001/api/applications/${formData.id}`, {
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
      console.log('Application updated successfully:', result);
      
      // Navigate back to admin panel
      navigate('/admin');
      
    } catch (error) {
      console.error('Error saving application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save application: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin');
  };

  const saveApplicationData = async () => {
    if (!formData) return;

    const updateData = {
      // Admin-only fields
      fisEntered: formData.fisEntered,
      processingTimeWeeks: formData.processingTimeWeeks != null && String(formData.processingTimeWeeks) !== '' ? Number(formData.processingTimeWeeks) : undefined,
      primaryAppointmentStartDate: formData.primaryAppointmentStartDate 
        ? formatDateForInput(formData.primaryAppointmentStartDate)
        : null,
      primaryAppointmentEndDate: formData.primaryAppointmentEndDate 
        ? formatDateForInput(formData.primaryAppointmentEndDate)
        : null,
      
      // Question fields
      contributionsQuestion: formData.contributionsQuestion,
      alignmentQuestion: formData.alignmentQuestion,
      enhancementQuestion: formData.enhancementQuestion,
      
      // Faculty member fields
      facultyMember: {
        name: formData.facultyMember.name,
        email: formData.facultyMember.email,
        title: formData.facultyMember.title,
        college: formData.facultyMember.college,
        department: formData.facultyMember.department,
        institution: formData.facultyMember.institution
      },
      
      // Approver fields
      approvers: {
        departmentChair: {
          name: formData.departmentChairName || '',
          email: formData.departmentChairEmail || ''
        },
        divisionChair: {
          name: formData.divisionChairName || '',
          email: formData.divisionChairEmail || ''
        },
        dean: {
          name: formData.deanName || '',
          email: formData.deanEmail || ''
        },
        seniorAssociateDean: {
          name: formData.seniorAssociateDeanName || '',
          email: formData.seniorAssociateDeanEmail || ''
        }
      }
    };

    const response = await fetch(`http://localhost:3001/api/applications/${formData.id}`, {
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

    return await response.json();
  };

  const handleSaveAndApprove = async () => {
    if (!formData || !application) return;

    setSaving(true);
    try {
      // First save the data without navigating
      await saveApplicationData();

      // Then advance the status to CCC Associate Dean Review
      const response = await fetch(`http://localhost:3001/api/applications/${application.id}/advance-to-associate-dean`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: 'Approved after admin edits'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to advance application status');
      }

      alert('Application saved and advanced to CCC Associate Dean Review successfully!');
      navigate('/admin');
    } catch (error) {
      console.error('Error saving and advancing application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error saving and advancing application: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndComplete = () => {
    setShowCompleteModal(true);
  };

  const confirmSaveAndComplete = async () => {
    if (!formData || !application) return;

    setSaving(true);
    try {
      // First save the data
      await saveApplicationData();

      // Then change status to completed
      const response = await fetch(`http://localhost:3001/api/applications/${application.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete application');
      }

      setShowCompleteModal(false);
      alert('Application saved and completed successfully!');
      navigate('/admin');
    } catch (error) {
      console.error('Error completing application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error completing application: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const statusOptions: { value: ApplicationStatus; label: string }[] = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'ccc_review', label: 'CCC Review' },
    { value: 'ccc_associate_dean_review', label: 'CCC Associate Dean Review' },
    { value: 'awaiting_primary_approval', label: 'Awaiting Primary Approval' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'fis_entry_pending', label: 'FIS Entry Pending' },
    { value: 'completed', label: 'Completed' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!application || !formData) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900">Application not found</h3>
        <button
          onClick={() => navigate('/admin')}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Back to Admin Panel
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Admin Panel
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Application</h1>
            <p className="text-gray-600">Application ID: {application.id}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <X className="inline mr-1 h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${
                saving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              <Save className="inline mr-1 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {application?.status === 'ccc_review' && (
              <button
                onClick={handleSaveAndApprove}
                disabled={saving}
                className={`px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-white ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <CheckCircle className="inline mr-1 h-4 w-4" />
                {saving ? 'Saving...' : 'Save and Approve Review'}
              </button>
            )}
            {application?.status === 'fis_entry_pending' && (
              <button
                onClick={handleSaveAndComplete}
                disabled={saving}
                className={`px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-white ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <CheckCircle className="inline mr-1 h-4 w-4" />
                {saving ? 'Saving...' : 'Save and Complete Application'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Faculty Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Faculty Information</h3>
          </div>
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

        {/* Application Status and Approvers */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Building2 className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Application Status & Approvers</h3>
          </div>
          
          {/* Current Status */}
          <div className="mb-6">
            <label className="block text-md font-medium text-gray-900 mb-1">Current Status</label>
            {/* <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md"> */}
              <span className="text-sm text-gray-900">
                {statusOptions.find(option => option.value === formData.status)?.label || formData.status}
              </span>
            {/* </div> */}
          </div>
          
          {/* Approvers */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Application Approvers</h4>
            <div className="space-y-4">
              {getApproversForApplication(formData).map((approver, index) => (
                <div key={approver.key} className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md">
                      <span className="text-sm text-gray-900">{approver.role}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={approver.name}
                      onChange={(e) => handleApproverChange(approver.key, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter approver name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={approver.email}
                      onChange={(e) => handleApproverChange(approver.key, 'email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter approver email"
                    />
                  </div>
                </div>
              ))}
            </div>
            {getApproversForApplication(formData).length === 0 && (
              <p className="text-sm text-gray-500 italic">No approvers configured for this application.</p>
            )}
          </div>
        </div>

        {/* Admin-Only Fields */}
        <div className="bg-blue-50 shadow rounded-lg p-6 border border-blue-200">
          <div className="flex items-center mb-4">
            <Info className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Admin-Only Fields</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Appointment Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.primaryAppointmentStartDate)}
                onChange={(e) => handleInputChange('primaryAppointmentStartDate', parseDateFromInput(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.primaryAppointmentStartDate ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              {errors.primaryAppointmentStartDate && (
                <p className="mt-1 text-sm text-red-600">{errors.primaryAppointmentStartDate}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                This date is only visible to administrators
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Appointment End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.primaryAppointmentEndDate)}
                onChange={(e) => handleInputChange('primaryAppointmentEndDate', parseDateFromInput(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.primaryAppointmentEndDate ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              {errors.primaryAppointmentEndDate && (
                <p className="mt-1 text-sm text-red-600">{errors.primaryAppointmentEndDate}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                This date is only visible to administrators
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Appointment FIS Entered?</label>
              {formData.status === 'fis_entry_pending' || formData.status === 'completed' ? (
                <select
                  value={formData.fisEntered.toString()}
                  onChange={(e) => handleInputChange('fisEntered', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              ) : (
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                  Not yet approved
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Application Questions */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <FileText className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Application Questions</h3>
          </div>
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
        </div>
      </div>

      {/* FIS Entry Confirmation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Complete Application
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Has the FIS (Faculty Information System) entry been completed for this application?
                  </p>
                </div>
                <div className="flex justify-center space-x-4 px-4 py-3">
                  <button
                    onClick={() => setShowCompleteModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSaveAndComplete}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
                  >
                    {saving ? 'Completing...' : 'Yes, Complete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEditApplication;