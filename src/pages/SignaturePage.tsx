import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  User, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Application } from '../types';
import { applicationApi } from '../utils/api';
import CVPreview from '../components/CVPreview';

const SignaturePage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [searchParams] = useSearchParams();
  const approverEmail = searchParams.get('approver');
  const token = searchParams.get('token');

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [selectedAction, setSelectedAction] = useState<'approve' | 'deny' | null>(null);
  const [signature, setSignature] = useState('');
  const [notes, setNotes] = useState('');
  const [signatureError, setSignatureError] = useState('');

  // Token validation state
  const [tokenValidation, setTokenValidation] = useState<{valid: boolean, used: boolean, message: string} | null>(null);


  useEffect(() => {
    const loadApplication = async () => {
      if (!applicationId) {
        setError('Invalid application link');
        setLoading(false);
        return;
      }

      if (!approverEmail || !token) {
        setError('Invalid approval link. Missing required parameters.');
        setLoading(false);
        return;
      }

      try {
        const response = await applicationApi.getById(applicationId);
        const app = response.data;
        
        // Check if the approver email matches any of the application's approvers
        const hasPermission = 
          app.departmentChairEmail === approverEmail ||
          app.divisionChairEmail === approverEmail ||
          app.deanEmail === approverEmail ||
          app.seniorAssociateDeanEmail === approverEmail;
        
        if (!hasPermission) {
          setError('You do not have permission to view this application. Please check that you are using the correct approval link.');
          setLoading(false);
          return;
        }
        
        // Check if this application has already been fully approved
        if (app.status === 'completed' || app.status === 'fis_entry_pending') {
          setError('This application has already been fully processed and no longer requires approval.');
          setLoading(false);
          return;
        }
        
        setApplication(app);
      } catch (error: any) {
        console.error('Error loading application:', error);
        if (error.status === 404) {
          setError('Application not found. Please check that the application ID is correct.');
        } else if (error.status === 429) {
          setError('Too many requests. Please wait a moment and try again.');
        } else {
          setError('Unable to load application. Please try again later or contact support if the problem persists.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadApplication();
  }, [applicationId, approverEmail, token]);

  // Token validation effect
  useEffect(() => {
    const validateToken = async () => {
      if (!token || !applicationId) return;
      
      try {
        const response = await fetch(`http://localhost:3001/api/applications/validate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, applicationId })
        });
        
        const result = await response.json();
        setTokenValidation(result);
      } catch (error) {
        console.error('Token validation error:', error);
        setTokenValidation({ valid: false, used: false, message: 'Token validation failed' });
      }
    };

    if (application) {
      validateToken();
    }
  }, [token, applicationId, application]);

  const validateSignature = (inputSignature: string): boolean => {
    if (!inputSignature.trim()) {
      setSignatureError('Signature is required');
      return false;
    }
    
    // Basic validation - must contain at least first and last name
    const nameParts = inputSignature.trim().split(' ');
    if (nameParts.length < 2) {
      setSignatureError('Please enter your full name (first and last name)');
      return false;
    }
    
    setSignatureError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAction) {
      setError('Please select approve or deny');
      return;
    }

    if (!validateSignature(signature)) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Call approval API using the new token-based endpoint
      const response = await fetch(`http://localhost:3001/api/applications/${applicationId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approverEmail: approverEmail!,
          token: token!,
          action: selectedAction,
          signature: signature.trim(),
          notes: notes.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      setSuccess(true);
    } catch (error) {
      console.error('Approval submission error:', error);
      setError('Failed to submit approval. Please try again or contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a 
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {selectedAction === 'approve' ? 'Application Approved' : 'Application Denied'}
          </h1>
          <p className="text-gray-600 mb-6">
            Your decision has been recorded.
          </p>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-600">Application: {application?.id}</p>
            <p className="text-sm text-gray-600">Faculty: {application?.facultyMember.name}</p>
            <p className="text-sm text-gray-600">Your signature: {signature}</p>
            {notes && <p className="text-sm text-gray-600">Notes: {notes}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Application not found</p>
        </div>
      </div>
    );
  }

  // Check if this token has already been used or if application is in a final state
  const hasAlreadyReviewed = tokenValidation?.used || 
    // Also check if application is in a final state
    ['rejected', 'fis_entry_pending', 'completed'].includes(application?.status || '');

  if (tokenValidation && (!tokenValidation.valid || hasAlreadyReviewed)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {tokenValidation.used ? 'Already Reviewed' : 'Invalid Token'}
          </h1>
          <p className="text-gray-600 mb-6">
            {tokenValidation.message || 'This approval link has already been used or is no longer valid.'}
          </p>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-600">Application: {application?.id}</p>
            <p className="text-sm text-gray-600">Faculty: {application?.facultyMember.name}</p>
            <p className="text-sm text-gray-600">Current Status: {application?.status.replace('_', ' ').toUpperCase()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Secondary Appointment Approval
          </h1>
          <p className="text-gray-600">
            Please review the application and provide your approval decision
          </p>
        </div>

        {/* Application Details */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Application Details</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Faculty Information */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-500" />
                Faculty Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
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
                  <label className="block text-sm font-medium text-gray-700">Current Institution</label>
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

            {/* Application Information */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-gray-500" />
                Application Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Application ID</label>
                  <p className="text-sm text-gray-900 font-mono">{application.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Submitted</label>
                  <p className="text-sm text-gray-900">
                    {application.submittedAt instanceof Date 
                      ? application.submittedAt.toLocaleDateString()
                      : new Date(application.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Application Questions */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3">Application Questions</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    1. How will your expertise and research contributions enhance the College of Connected Computing's mission and goals?
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.contributionsQuestion}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    2. How does your work align with the College's interdisciplinary approach to computing?
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.alignmentQuestion}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    3. What collaborative opportunities do you foresee that would enhance both your research and the College's impact?
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.enhancementQuestion}</p>
                </div>
              </div>
            </div>

            {/* CV Preview */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3">Curriculum Vitae</h3>
              <CVPreview 
                applicationId={application.id} 
                fileName={application.cvFileName}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Approval Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Your Decision</h2>
            <p className="text-sm text-gray-600 mt-1">
              Approving as: {approverEmail}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Approval Decision */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Approval Decision *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedAction('approve')}
                  className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium transition-colors ${
                    selectedAction === 'approve'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Approve Application
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAction('deny')}
                  className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium transition-colors ${
                    selectedAction === 'deny'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Deny Application
                </button>
              </div>
            </div>

            {/* Digital Signature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Digital Signature *
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                  signatureError ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Type your full name here"
                required
              />
              {signatureError && (
                <p className="mt-1 text-sm text-red-600">{signatureError}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                By typing your full name, you are providing your digital signature for this decision.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Add any additional comments about your decision..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="submit"
                disabled={!selectedAction || !signature.trim() || submitting}
                className={`px-10 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  !selectedAction || !signature.trim() || submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : selectedAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  `${selectedAction === 'approve' ? 'Approve' : 'Deny'} Application`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignaturePage;