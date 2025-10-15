import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Building2, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Mail,
  Calendar
} from 'lucide-react';
import { College, Department, ContactInfo } from '../types';

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
  const [activeTab, setActiveTab] = useState('colleges');

  const tabs = [
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
          {activeTab === 'colleges' && <CollegesTab />}
          {activeTab === 'settings' && <SystemSettingsTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;