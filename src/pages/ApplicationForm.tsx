import React, { useState } from 'react';
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
  effectiveDate: string;
  duration: '1year' | '2year' | '3year' | '';
  rationale: string;
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
    effectiveDate: '',
    duration: '',
    rationale: '',
    cvFile: null,
    departmentChairName: '',
    departmentChairEmail: '',
    divisionChairName: '',
    divisionChairEmail: '',
    deanName: '',
    deanEmail: '',
    seniorAssociateDeanName: '',
    seniorAssociateDeanEmail: '',
    collegeHasDepartments: true
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [approvalChainLoaded, setApprovalChainLoaded] = useState(false);


  // Mock college data - in real app, this would come from API
  const colleges: College[] = [
    {
      id: '1',
      name: 'School of Engineering',
      hasDepartments: true,
      dean: { name: 'Dr. Patricia Williams', email: 'patricia.williams@vanderbilt.edu', title: 'Dean' }
    },
    {
      id: '2',
      name: 'College of Arts & Science',
      hasDepartments: true,
      dean: { name: 'Dr. John Geer', email: 'john.geer@vanderbilt.edu', title: 'Dean' }
    },
    {
      id: '3',
      name: 'School of Medicine',
      hasDepartments: true,
      dean: { name: 'Dr. Jennifer Davis', email: 'jennifer.davis@vumc.org', title: 'Dean' }
    },
    {
      id: '4',
      name: 'Owen Graduate School of Management',
      hasDepartments: false,
      dean: { name: 'Dr. Eric Johnson', email: 'eric.johnson@vanderbilt.edu', title: 'Dean' }
    },
    {
      id: '5',
      name: 'Blair School of Music',
      hasDepartments: false,
      dean: { name: 'Dr. Mark Wait', email: 'mark.wait@vanderbilt.edu', title: 'Dean' }
    }
  ];

  const handleInputChange = (field: keyof FormData, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-populate approval chain when college is selected
    if (field === 'college') {
      const selectedCollege = colleges.find(c => c.name === value);
      if (selectedCollege) {
        setFormData(prev => ({
          ...prev,
          collegeHasDepartments: selectedCollege.hasDepartments,
          deanName: selectedCollege.dean.name,
          deanEmail: selectedCollege.dean.email,
          // Clear department if college doesn't have departments or isn't Engineering/Arts & Science
          department: (selectedCollege.name === 'School of Engineering' || selectedCollege.name === 'College of Arts & Science') ? prev.department : ''
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
    
    // Department is only required for Engineering and Arts & Science
    const requiresDepartment = formData.college === 'School of Engineering' || formData.college === 'College of Arts & Science';
    if (requiresDepartment && !formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    
    if (!formData.college.trim()) newErrors.college = 'College is required';
    if (!formData.appointmentType.trim()) newErrors.appointmentType = 'Appointment type is required';
    if (!formData.effectiveDate.trim()) newErrors.effectiveDate = 'Effective date is required';
    if (!formData.duration.trim()) newErrors.duration = 'Duration is required';
    if (!formData.rationale.trim()) newErrors.rationale = 'Rationale is required';
    if (!formData.cvFile) newErrors.cvFile = 'CV is required';


    // Approval chain validation
    if (formData.collegeHasDepartments) {
      if (!formData.departmentChairName.trim()) {
        newErrors.departmentChairName = 'Department Chair name is required';
      }
      if (!formData.departmentChairEmail.trim()) {
        newErrors.departmentChairEmail = 'Department Chair email is required';
      } else if (!validateEmail(formData.departmentChairEmail)) {
        newErrors.departmentChairEmail = 'Must be a valid Vanderbilt or VUMC email';
      }
    }

    if (!formData.deanName.trim()) newErrors.deanName = 'Dean name is required';
    if (!formData.deanEmail.trim()) newErrors.deanEmail = 'Dean email is required';
    else if (!validateEmail(formData.deanEmail)) {
      newErrors.deanEmail = 'Must be a valid Vanderbilt or VUMC email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

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
      formDataToSubmit.append('appointmentType', formData.appointmentType);
      formDataToSubmit.append('effectiveDate', formData.effectiveDate);
      formDataToSubmit.append('duration', formData.duration);
      formDataToSubmit.append('rationale', formData.rationale);
      
      // Add approval chain fields
      formDataToSubmit.append('departmentChairName', formData.departmentChairName);
      formDataToSubmit.append('departmentChairEmail', formData.departmentChairEmail);
      formDataToSubmit.append('divisionChairName', formData.divisionChairName);
      formDataToSubmit.append('divisionChairEmail', formData.divisionChairEmail);
      formDataToSubmit.append('deanName', formData.deanName);
      formDataToSubmit.append('deanEmail', formData.deanEmail);
      formDataToSubmit.append('seniorAssociateDeanName', formData.seniorAssociateDeanName);
      formDataToSubmit.append('seniorAssociateDeanEmail', formData.seniorAssociateDeanEmail);
      
      // Add college departments flag
      const selectedCollege = colleges.find(c => c.name === formData.college);
      formDataToSubmit.append('collegeHasDepartments', selectedCollege?.hasDepartments ? 'true' : 'false');
      
      // Add CV file
      if (formData.cvFile) {
        formDataToSubmit.append('cvFile', formData.cvFile);
      }
      
      // Submit to API
      await applicationApi.submit(formDataToSubmit);
      
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        title: '',
        department: '',
        college: '',
        institution: 'vanderbilt',
        appointmentType: '',
        effectiveDate: '',
        duration: '',
        rationale: '',
        cvFile: null,
        departmentChairName: '',
        departmentChairEmail: '',
        divisionChairName: '',
        divisionChairEmail: '',
        deanName: '',
        deanEmail: '',
        seniorAssociateDeanName: '',
        seniorAssociateDeanEmail: '',
        collegeHasDepartments: true
      });
    } catch (error) {
      console.error('Submission error:', error);
      // You could add error state here to show user the error
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            You will receive email notifications as your application progresses through the approval process.
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
                placeholder="Dr. Jane Smith"
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
                placeholder="jane.smith@vanderbilt.edu"
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

            {/* Department field - only show for Engineering and Arts & Science */}
            {(formData.college === 'School of Engineering' || formData.college === 'College of Arts & Science') && (
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective Date *
              </label>
              <input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.effectiveDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.effectiveDate && <p className="mt-1 text-sm text-red-600">{errors.effectiveDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration *
              </label>
              <select
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.duration ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Duration</option>
                <option value="1year">1 Year</option>
                <option value="2year">2 Years</option>
                <option value="3year">3 Years</option>
              </select>
              {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
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
                    {formData.collegeHasDepartments 
                      ? "Your application will require approval from your department chair and college dean."
                      : "Your college does not have departments, so your application will go directly to the dean."
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {formData.collegeHasDepartments && (
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
                      placeholder="Dr. Robert Chen"
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
                      placeholder="robert.chen@vanderbilt.edu"
                    />
                    {errors.departmentChairEmail && <p className="mt-1 text-sm text-red-600">{errors.departmentChairEmail}</p>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dean Name *
                  </label>
                  <input
                    type="text"
                    value={formData.deanName}
                    onChange={(e) => handleInputChange('deanName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                      errors.deanName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Dr. Patricia Williams"
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
                    onChange={(e) => handleInputChange('deanEmail', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                      errors.deanEmail ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="patricia.williams@vanderbilt.edu"
                  />
                  {errors.deanEmail && <p className="mt-1 text-sm text-red-600">{errors.deanEmail}</p>}
                </div>
              </div>
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
                Rationale for Secondary Appointment *
              </label>
              <textarea
                value={formData.rationale}
                onChange={(e) => handleInputChange('rationale', e.target.value)}
                rows={6}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  errors.rationale ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Please describe how this secondary appointment aligns with CCC's mission and your research interests..."
              />
              {errors.rationale && <p className="mt-1 text-sm text-red-600">{errors.rationale}</p>}
              <p className="mt-1 text-sm text-gray-500">
                Describe how this appointment will contribute to your research, teaching, or service activities within CCC.
              </p>
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
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Save as Draft
          </button>
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