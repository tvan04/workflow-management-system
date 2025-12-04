import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  CheckCircle, 
  Info,
  Building2,
  Users,
  FileText
} from 'lucide-react';
import { InstitutionalAffiliation, College } from '../types';
import { applicationApi } from '../utils/api';

interface FormData {
  // Faculty Information
  name: string;
  email: string;
  title: string;
  department: string;
  college: string;
  institution: InstitutionalAffiliation;
  
  // Application Details
  appointmentType: 'initial' | 'secondary' | '';
  contributionsQuestion: string;
  alignmentQuestion: string;
  enhancementQuestion: string;
  cvFile: File | null;
  
  
  // Approval Chain (for manual entry)
  departmentChairName: string;
  departmentChairEmail: string;
  divisionChairName: string;
  divisionChairEmail: string;
  deanName: string;
  deanEmail: string;
  seniorAssociateDeanName: string;
  seniorAssociateDeanEmail: string;
  
  // VUMC-specific approvers
  primaryChairName: string;
  primaryChairEmail: string;
  
  // Configuration
  collegeHasDepartments: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const ApplicationForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    title: '',
    department: '',
    college: '',
    institution: 'vanderbilt',
    appointmentType: '',
    contributionsQuestion: '',
    alignmentQuestion: '',
    enhancementQuestion: '',
    cvFile: null,
    departmentChairName: '',
    departmentChairEmail: '',
    divisionChairName: '',
    divisionChairEmail: '',
    deanName: '',
    deanEmail: '',
    seniorAssociateDeanName: '',
    seniorAssociateDeanEmail: '',
    primaryChairName: '',
    primaryChairEmail: '',
    collegeHasDepartments: true
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const submissionInProgress = useRef(false);
  const lastSubmissionData = useRef<string | null>(null);
  const [approvalChainLoaded, setApprovalChainLoaded] = useState(false);


  // Mock college data - in real app, this would come from API
  const colleges: College[] = [
    {
      id: '1',
      name: 'School of Engineering',
      hasDepartments: true,
      dean: { name: 'Dr. Patricia Williams', email: 'patricia.williams@vanderbilt.edu', title: 'Dean' },
      requiredApprovers: ['departmentChair', 'dean']
    },
    {
      id: '2',
      name: 'College of Arts & Science',
      hasDepartments: true,
      dean: { name: 'Dr. John Geer', email: 'john.geer@vanderbilt.edu', title: 'Dean' },
      associateDean: { name: 'Dr. Sarah Thompson', email: 'sarah.thompson@vanderbilt.edu', title: 'Associate Dean' },
      requiredApprovers: ['departmentChair', 'associateDean']
    },
    {
      id: '3',
      name: 'School of Medicine - Basic Sciences',
      hasDepartments: true,
      dean: { name: 'Dr. Jennifer Davis', email: 'jennifer.davis@vumc.org', title: 'Dean' },
      requiredApprovers: ['departmentChair']
    },
    {
      id: '4',
      name: 'Owen Graduate School of Management',
      hasDepartments: false,
      dean: { name: 'Dr. Eric Johnson', email: 'eric.johnson@vanderbilt.edu', title: 'Dean' },
      associateDean: { name: 'Dr. Michael Brown', email: 'michael.brown@vanderbilt.edu', title: 'Associate Dean' },
      requiredApprovers: ['associateDean', 'dean']
    },
    {
      id: '5',
      name: 'Blair School of Music',
      hasDepartments: false,
      dean: { name: 'Dr. Mark Wait', email: 'mark.wait@vanderbilt.edu', title: 'Dean' },
      associateDean: { name: 'Dr. Lisa Carter', email: 'lisa.carter@vanderbilt.edu', title: 'Associate Dean' },
      requiredApprovers: ['associateDean', 'dean']
    },
    {
      id: '6',
      name: 'Peabody College',
      hasDepartments: true,
      dean: { name: 'Dr. Jennifer Wilson', email: 'jennifer.wilson@vanderbilt.edu', title: 'Dean' },
      requiredApprovers: ['departmentChair', 'dean']
    },
    {
      id: '7',
      name: 'Law School',
      hasDepartments: false,
      dean: { name: 'Dr. Christopher Guthrie', email: 'christopher.guthrie@vanderbilt.edu', title: 'Dean' },
      viceDean: { name: 'Dr. Rebecca Brown', email: 'rebecca.brown@vanderbilt.edu', title: 'Vice Dean' },
      requiredApprovers: ['viceDean']
    },
    {
      id: '8',
      name: 'Divinity School',
      hasDepartments: false,
      dean: { name: 'Dr. Emilie Townes', email: 'emilie.townes@vanderbilt.edu', title: 'Dean' },
      requiredApprovers: ['dean']
    },
    {
      id: '9',
      name: 'School of Nursing',
      hasDepartments: false,
      dean: { name: 'Dr. Linda Norman', email: 'linda.norman@vanderbilt.edu', title: 'Dean' },
      requiredApprovers: ['dean']
    }
  ];

  const handleInputChange = (field: keyof FormData, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Handle institution change
    if (field === 'institution') {
      if (value === 'vumc') {
        // Clear college and set up VUMC-specific fields
        setFormData(prev => ({
          ...prev,
          college: '',
          collegeHasDepartments: false,
          // Clear all other approver fields
          departmentChairName: '',
          departmentChairEmail: '',
          deanName: '',
          deanEmail: '',
          seniorAssociateDeanName: '',
          seniorAssociateDeanEmail: '',
          primaryChairName: '',
          primaryChairEmail: '',
          divisionChairName: '',
          divisionChairEmail: ''
        }));
        setApprovalChainLoaded(true);
      } else {
        // Reset approval chain for Vanderbilt selection
        setApprovalChainLoaded(false);
      }
    }

    // Auto-populate approval chain when college is selected
    if (field === 'college') {
      const selectedCollege = colleges.find(c => c.name === value);
      if (selectedCollege) {
        const newFormData: Partial<FormData> = {
          collegeHasDepartments: selectedCollege.hasDepartments,
          // Clear department if college doesn't have departments
          department: selectedCollege.hasDepartments ? formData.department : '',
          // Clear all approver fields first
          departmentChairName: '',
          departmentChairEmail: '',
          deanName: '',
          deanEmail: '',
          seniorAssociateDeanName: '',
          seniorAssociateDeanEmail: ''
        };

        // Required approver fields will be filled manually by applicants

        setFormData(prev => ({
          ...prev,
          ...newFormData
        }));
        setApprovalChainLoaded(true);
      }
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isVanderbiltEmail = email.endsWith('@vanderbilt.edu') || email.endsWith('@vumc.org');
    return emailRegex.test(email) && isVanderbiltEmail;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!validateEmail(formData.email)) {
      newErrors.email = 'Must be a valid Vanderbilt (@vanderbilt.edu) or VUMC (@vumc.org) email';
    }
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    
    // College and department validation depends on institution
    if (formData.institution === 'vanderbilt') {
      if (!formData.college.trim()) newErrors.college = 'College is required';
      
      // Department is required for colleges that have departments
      const selectedCollege = colleges.find(c => c.name === formData.college);
      const requiresDepartment = selectedCollege?.hasDepartments || false;
      if (requiresDepartment && !formData.department.trim()) {
        newErrors.department = 'Department is required';
      }
    }
    if (!formData.appointmentType.trim()) newErrors.appointmentType = 'Appointment type is required';
    if (!formData.contributionsQuestion.trim()) newErrors.contributionsQuestion = 'This question is required';
    if (!formData.alignmentQuestion.trim()) newErrors.alignmentQuestion = 'This question is required';
    if (!formData.enhancementQuestion.trim()) newErrors.enhancementQuestion = 'This question is required';
    if (!formData.cvFile) newErrors.cvFile = 'CV is required';


    // Approval chain validation
    if (formData.institution === 'vumc') {
      // VUMC validation: Primary Chair required, Division Leader optional
      if (!formData.primaryChairName.trim()) {
        newErrors.primaryChairName = 'Primary Chair name is required';
      }
      if (!formData.primaryChairEmail.trim()) {
        newErrors.primaryChairEmail = 'Primary Chair email is required';
      } else if (!validateEmail(formData.primaryChairEmail)) {
        newErrors.primaryChairEmail = 'Must be a valid Vanderbilt or VUMC email';
      }
      
      // Division Leader is optional, but if provided, must be valid
      if (formData.divisionChairEmail.trim() && !validateEmail(formData.divisionChairEmail)) {
        newErrors.divisionChairEmail = 'Must be a valid Vanderbilt or VUMC email';
      }
    } else {
      // Vanderbilt validation based on college requirements
      const selectedCollege = colleges.find(c => c.name === formData.college);
      const requiredApprovers = selectedCollege?.requiredApprovers || [];

      if (requiredApprovers.includes('departmentChair')) {
        if (!formData.departmentChairName.trim()) {
          newErrors.departmentChairName = 'Department Chair name is required';
        }
        if (!formData.departmentChairEmail.trim()) {
          newErrors.departmentChairEmail = 'Department Chair email is required';
        } else if (!validateEmail(formData.departmentChairEmail)) {
          newErrors.departmentChairEmail = 'Must be a valid Vanderbilt or VUMC email';
        }
      }

      if (requiredApprovers.includes('dean') || requiredApprovers.includes('viceDean')) {
        const fieldLabel = requiredApprovers.includes('viceDean') ? 'Vice Dean' : 'Dean';
        if (!formData.deanName.trim()) newErrors.deanName = `${fieldLabel} name is required`;
        if (!formData.deanEmail.trim()) newErrors.deanEmail = `${fieldLabel} email is required`;
        else if (!validateEmail(formData.deanEmail)) {
          newErrors.deanEmail = 'Must be a valid Vanderbilt or VUMC email';
        }
      }

      if (requiredApprovers.includes('associateDean')) {
        if (!formData.seniorAssociateDeanName.trim()) {
          newErrors.seniorAssociateDeanName = 'Associate Dean name is required';
        }
        if (!formData.seniorAssociateDeanEmail.trim()) {
          newErrors.seniorAssociateDeanEmail = 'Associate Dean email is required';
        } else if (!validateEmail(formData.seniorAssociateDeanEmail)) {
          newErrors.seniorAssociateDeanEmail = 'Must be a valid Vanderbilt or VUMC email';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Create a unique signature for this submission
    const submissionSignature = JSON.stringify({
      name: formData.name,
      email: formData.email,
      timestamp: Date.now()
    });
    
    // Prevent duplicate submissions using ref (survives re-renders)
    if (submissionInProgress.current) {
      console.log('Submission already in progress, ignoring duplicate');
      return;
    }
    
    // Prevent identical submissions
    if (lastSubmissionData.current === submissionSignature) {
      console.log('Identical submission detected, ignoring duplicate');
      return;
    }
    
    // Prevent resubmission after success
    if (submitSuccess && submissionId) {
      console.log('Application already submitted successfully, ignoring resubmission');
      return;
    }

    submissionInProgress.current = true;
    lastSubmissionData.current = submissionSignature;
    setIsSubmitting(true);
    
    try {
      // Create FormData for API submission
      const formDataToSubmit = new FormData();
      
      // Add all form fields to FormData
      formDataToSubmit.append('name', formData.name);
      formDataToSubmit.append('email', formData.email);
      formDataToSubmit.append('title', formData.title);
      formDataToSubmit.append('department', formData.department);
      formDataToSubmit.append('college', formData.college);
      formDataToSubmit.append('institution', formData.institution);
      formDataToSubmit.append('appointmentType', formData.appointmentType);
      formDataToSubmit.append('contributionsQuestion', formData.contributionsQuestion);
      formDataToSubmit.append('alignmentQuestion', formData.alignmentQuestion);
      formDataToSubmit.append('enhancementQuestion', formData.enhancementQuestion);
      
      // Add approval chain fields - map VUMC fields to standard fields
      if (formData.institution === 'vumc') {
        // For VUMC, map primary chair to department chair fields
        formDataToSubmit.append('departmentChairName', formData.primaryChairName);
        formDataToSubmit.append('departmentChairEmail', formData.primaryChairEmail);
        formDataToSubmit.append('divisionChairName', formData.divisionChairName);
        formDataToSubmit.append('divisionChairEmail', formData.divisionChairEmail);
        // Clear other fields for VUMC
        formDataToSubmit.append('deanName', '');
        formDataToSubmit.append('deanEmail', '');
        formDataToSubmit.append('seniorAssociateDeanName', '');
        formDataToSubmit.append('seniorAssociateDeanEmail', '');
      } else {
        // For Vanderbilt, use standard fields
        formDataToSubmit.append('departmentChairName', formData.departmentChairName);
        formDataToSubmit.append('departmentChairEmail', formData.departmentChairEmail);
        formDataToSubmit.append('divisionChairName', formData.divisionChairName);
        formDataToSubmit.append('divisionChairEmail', formData.divisionChairEmail);
        formDataToSubmit.append('deanName', formData.deanName);
        formDataToSubmit.append('deanEmail', formData.deanEmail);
        formDataToSubmit.append('seniorAssociateDeanName', formData.seniorAssociateDeanName);
        formDataToSubmit.append('seniorAssociateDeanEmail', formData.seniorAssociateDeanEmail);
      }
      
      // Add college departments flag
      const selectedCollege = colleges.find(c => c.name === formData.college);
      formDataToSubmit.append('collegeHasDepartments', selectedCollege?.hasDepartments ? 'true' : 'false');
      
      // Add CV file
      if (formData.cvFile) {
        formDataToSubmit.append('cvFile', formData.cvFile);
      }
      
      // Submit to API
      const response = await applicationApi.submit(formDataToSubmit);
      
      // Track successful submission to prevent duplicates
      setSubmissionId(response.data.applicationId);
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        title: '',
        department: '',
        college: '',
        institution: 'vanderbilt',
        appointmentType: '',
        contributionsQuestion: '',
        alignmentQuestion: '',
        enhancementQuestion: '',
        cvFile: null,
        departmentChairName: '',
        departmentChairEmail: '',
        divisionChairName: '',
        divisionChairEmail: '',
        deanName: '',
        deanEmail: '',
        seniorAssociateDeanName: '',
        seniorAssociateDeanEmail: '',
        primaryChairName: '',
        primaryChairEmail: '',
        collegeHasDepartments: true
      });
    } catch (error) {
      console.error('Submission error:', error);
      // You could add error state here to show user the error
      alert('Failed to submit application. Please try again.');
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  }, [formData, validateForm, submitSuccess, submissionId, colleges]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, cvFile: 'Please upload a PDF or Word document' }));
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, cvFile: 'File size must be less than 10MB' }));
        return;
      }

      handleInputChange('cvFile', file);
    }
  };

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-md p-6 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
          <h3 className="text-lg font-medium text-green-800 mb-2">Application Submitted Successfully!</h3>
          <p className="text-green-700 mb-4">
            Your secondary appointment application has been submitted and is now in the CCC review queue.
          </p>
          <p className="text-sm text-green-600">
            You can track your application status using the Status page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Secondary Appointment Application</h1>
        <p className="text-gray-600">College of Connected Computing - Vanderbilt University</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Faculty Information Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Faculty Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Applicant Name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="applicant@vanderbilt.edu"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Professor, Associate Professor, etc."
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Institutional Affiliation *
              </label>
              <select
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value as InstitutionalAffiliation)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="vanderbilt">Vanderbilt University</option>
                <option value="vumc">Vanderbilt University Medical Center</option>
              </select>
            </div>

            {/* Only show Primary College field for Vanderbilt University */}
            {formData.institution === 'vanderbilt' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary College *
                </label>
                <select
                  value={formData.college}
                  onChange={(e) => handleInputChange('college', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                    errors.college ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select College</option>
                  {colleges.map((college) => (
                    <option key={college.id} value={college.name}>
                      {college.name}
                    </option>
                  ))}
                </select>
                {errors.college && <p className="mt-1 text-sm text-red-600">{errors.college}</p>}
              </div>
            )}

            {/* Department field - show for colleges that have departments */}
            {colleges.find(c => c.name === formData.college)?.hasDepartments && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Department *
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                    errors.department ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Computer Science, Biomedical Engineering, etc."
                />
                {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Appointment Details Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Building2 className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Appointment Details</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appointment Type *
              </label>
              <select
                value={formData.appointmentType}
                onChange={(e) => handleInputChange('appointmentType', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.appointmentType ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Type</option>
                <option value="initial">Initial Appointment</option>
                <option value="secondary">Secondary Reappointment</option>
              </select>
              {errors.appointmentType && <p className="mt-1 text-sm text-red-600">{errors.appointmentType}</p>}
            </div>
          </div>
        </div>

        {/* Approval Chain Section */}
        {approvalChainLoaded && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Building2 className="h-5 w-5 text-primary-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Approval Chain</h3>
            </div>
            
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Approval Process Information</p>
                  <p>
                    {formData.institution === 'vumc' 
                      ? "VUMC applications require Primary Chair approval. Division Leader approval is required if applicable."
                      : (() => {
                          const selectedCollege = colleges.find(c => c.name === formData.college);
                          const requiredApprovers = selectedCollege?.requiredApprovers || [];
                          return `Your application will require approval from: ${
                            requiredApprovers.map(approver => {
                              switch (approver) {
                                case 'departmentChair': return 'Department Chair';
                                case 'associateDean': return 'Associate Dean';
                                case 'viceDean': return 'Vice Dean';
                                case 'dean': return 'Dean';
                                default: return approver;
                              }
                            }).join(', ')
                          }.`;
                        })()
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {formData.institution === 'vumc' ? (
                // VUMC-specific approval fields
                <>
                  {/* Primary Chair (Required for VUMC) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Chair Name *
                      </label>
                      <input
                        type="text"
                        value={formData.primaryChairName}
                        onChange={(e) => handleInputChange('primaryChairName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                          errors.primaryChairName ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Primary Chair Name"
                      />
                      {errors.primaryChairName && <p className="mt-1 text-sm text-red-600">{errors.primaryChairName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Chair Email *
                      </label>
                      <input
                        type="email"
                        value={formData.primaryChairEmail}
                        onChange={(e) => handleInputChange('primaryChairEmail', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                          errors.primaryChairEmail ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Primary Chair Email"
                      />
                      {errors.primaryChairEmail && <p className="mt-1 text-sm text-red-600">{errors.primaryChairEmail}</p>}
                    </div>
                  </div>

                  {/* Division Leader (Optional for VUMC) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Division Leader Name <span className="text-gray-500">(If Applicable)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.divisionChairName}
                        onChange={(e) => handleInputChange('divisionChairName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Division Leader Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Division Leader Email <span className="text-gray-500">(If Applicable)</span>
                      </label>
                      <input
                        type="email"
                        value={formData.divisionChairEmail}
                        onChange={(e) => handleInputChange('divisionChairEmail', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                          errors.divisionChairEmail ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Division Leader Email"
                      />
                      {errors.divisionChairEmail && <p className="mt-1 text-sm text-red-600">{errors.divisionChairEmail}</p>}
                    </div>
                  </div>
                </>
              ) : (
                // Vanderbilt-specific approval fields
                (() => {
                  const selectedCollege = colleges.find(c => c.name === formData.college);
                  const requiredApprovers = selectedCollege?.requiredApprovers || [];
                  
                  return (
                    <>
                      {requiredApprovers.includes('departmentChair') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Department Chair Name *
                            </label>
                            <input
                              type="text"
                              value={formData.departmentChairName}
                              onChange={(e) => handleInputChange('departmentChairName', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                                errors.departmentChairName ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Department Chair Name"
                            />
                            {errors.departmentChairName && <p className="mt-1 text-sm text-red-600">{errors.departmentChairName}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Department Chair Email *
                            </label>
                            <input
                              type="email"
                              value={formData.departmentChairEmail}
                              onChange={(e) => handleInputChange('departmentChairEmail', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                                errors.departmentChairEmail ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Department Chair Email"
                            />
                            {errors.departmentChairEmail && <p className="mt-1 text-sm text-red-600">{errors.departmentChairEmail}</p>}
                          </div>
                        </div>
                      )}

                      {requiredApprovers.includes('associateDean') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Associate Dean Name *
                            </label>
                            <input
                              type="text"
                              value={formData.seniorAssociateDeanName}
                              onChange={(e) => handleInputChange('seniorAssociateDeanName', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                                errors.seniorAssociateDeanName ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Associate Dean Name"
                            />
                            {errors.seniorAssociateDeanName && <p className="mt-1 text-sm text-red-600">{errors.seniorAssociateDeanName}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Associate Dean Email *
                            </label>
                            <input
                              type="email"
                              value={formData.seniorAssociateDeanEmail}
                              onChange={(e) => handleInputChange('seniorAssociateDeanEmail', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                                errors.seniorAssociateDeanEmail ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Associate Dean Email"
                            />
                            {errors.seniorAssociateDeanEmail && <p className="mt-1 text-sm text-red-600">{errors.seniorAssociateDeanEmail}</p>}
                          </div>
                        </div>
                      )}

                      {(requiredApprovers.includes('dean') || requiredApprovers.includes('viceDean')) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {requiredApprovers.includes('viceDean') ? 'Vice Dean Name *' : 'Dean Name *'}
                            </label>
                            <input
                              type="text"
                              value={formData.deanName}
                              onChange={(e) => handleInputChange('deanName', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                                errors.deanName ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Dean Name"
                            />
                            {errors.deanName && <p className="mt-1 text-sm text-red-600">{errors.deanName}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {requiredApprovers.includes('viceDean') ? 'Vice Dean Email *' : 'Dean Email *'}
                            </label>
                            <input
                              type="email"
                              value={formData.deanEmail}
                              onChange={(e) => handleInputChange('deanEmail', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                                errors.deanEmail ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Dean Email"
                            />
                            {errors.deanEmail && <p className="mt-1 text-sm text-red-600">{errors.deanEmail}</p>}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {/* Application Details Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <FileText className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Application Details</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What specific contributions do you expect to make to the College of Connected Computing through this secondary appointment? *
              </label>
              <textarea
                value={formData.contributionsQuestion}
                onChange={(e) => handleInputChange('contributionsQuestion', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.contributionsQuestion ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the specific contributions you plan to make to CCC..."
              />
              {errors.contributionsQuestion && <p className="mt-1 text-sm text-red-600">{errors.contributionsQuestion}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How does your research, teaching, or service align with the interdisciplinary mission of the College of Connected Computing? *
              </label>
              <textarea
                value={formData.alignmentQuestion}
                onChange={(e) => handleInputChange('alignmentQuestion', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.alignmentQuestion ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Explain how your work aligns with CCC's interdisciplinary mission..."
              />
              {errors.alignmentQuestion && <p className="mt-1 text-sm text-red-600">{errors.alignmentQuestion}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How will this secondary appointment enhance your primary academic work and create a synergy between your primary school and the College of Connected Computing? *
              </label>
              <textarea
                value={formData.enhancementQuestion}
                onChange={(e) => handleInputChange('enhancementQuestion', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.enhancementQuestion ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe how this appointment will enhance your work and benefit both departments..."
              />
              {errors.enhancementQuestion && <p className="mt-1 text-sm text-red-600">{errors.enhancementQuestion}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Curriculum Vitae *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                      <span>Upload your CV</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 10MB</p>
                  {formData.cvFile && (
                    <div className="mt-2 text-sm text-green-600 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {formData.cvFile.name}
                    </div>
                  )}
                </div>
              </div>
              {errors.cvFile && <p className="mt-1 text-sm text-red-600">{errors.cvFile}</p>}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          {/* <button
            type="button"
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Save as Draft
          </button> */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApplicationForm;