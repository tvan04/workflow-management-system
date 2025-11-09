import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  Calendar,
  // Download,
  Sparkles
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Application, ApplicationStatus as AppStatus, DashboardMetrics } from '../types';
import { applicationApi, analyticsApi } from '../utils/api';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, trend }) => (
  <div className="card-interactive bg-gradient-to-br from-white to-surface-50">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-surface-600 uppercase tracking-wide">{title}</p>
        <p className="text-4xl font-bold text-vanderbilt-black-900 mt-2">{value}</p>
        {trend && (
          <div className="flex items-center mt-3 px-3 py-1 bg-success-100 text-success-700 rounded-full text-sm font-medium w-fit">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className={`relative p-4 rounded-2xl ${color} shadow-medium`}>
        <div className="absolute -inset-1 bg-gradient-to-r from-vanderbilt-gold-400 to-vanderbilt-gold-600 rounded-2xl opacity-20 blur-sm"></div>
        <Icon className="relative h-8 w-8 text-white" />
      </div>
    </div>
  </div>
);

interface ApplicationRowProps {
  application: Application;
}

const ApplicationRow: React.FC<ApplicationRowProps> = ({ application }) => {
  const getStatusColor = (status: AppStatus): string => {
    const colors: Record<string, string> = {
      'submitted': 'badge-info',
      'ccc_review': 'badge-warning',
      'ccc_associate_dean_review': 'bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium',
      'awaiting_primary_approval': 'bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium',
      'rejected': 'badge-error',
      'fis_entry_pending': 'bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium',
      'completed': 'bg-surface-100 text-surface-800 px-3 py-1 rounded-full text-sm font-medium',
      // Legacy statuses for backward compatibility
      'faculty_vote': 'bg-vanderbilt-navy-100 text-vanderbilt-navy-800 px-3 py-1 rounded-full text-sm font-medium',
      'approved': 'badge-success'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium';
  };

  const getStatusLabel = (status: AppStatus): string => {
    const labels: Record<string, string> = {
      'submitted': 'Submitted',
      'ccc_review': 'CCC Review',
      'ccc_associate_dean_review': 'CCC Associate Dean Review',
      'awaiting_primary_approval': 'Awaiting Primary Approval',
      'rejected': 'Rejected',
      'fis_entry_pending': 'FIS Entry Pending',
      'completed': 'Completed',
      // Legacy statuses for backward compatibility
      'faculty_vote': 'Legacy: Faculty Vote',
      'approved': 'Legacy: Approved'
    };
    return labels[status] || `Unknown: ${status}`;
  };

  const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(application.updatedAt).getTime()) / (1000 * 3600 * 24));
  const isStalled = daysSinceUpdate > 7 && !['completed', 'rejected'].includes(application.status);

  return (
    <tr className={`transition-all duration-200 ${isStalled ? 'bg-error-50 border-l-4 border-error-400' : 'hover:bg-surface-50'}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-vanderbilt-gold-400 to-vanderbilt-gold-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {application.facultyMember.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-vanderbilt-black-900">
              {application.facultyMember.name}
            </div>
            <div className="text-sm text-surface-600 font-medium">
              {application.facultyMember.department}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={getStatusColor(application.status)}>
          {getStatusLabel(application.status)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-surface-900">
        {application.currentApprover || 'CCC Staff'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-600">
        {new Date(application.submittedAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-surface-600">{daysSinceUpdate} days</span>
          {isStalled && (
            <div className="flex items-center space-x-1 text-error-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">STALLED</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-600">
        {(() => {
          // Don't show processing time for rejected applications
          if (application.status === 'rejected') {
            return <span className="text-gray-500">N/A</span>;
          }
          
          // For completed applications, calculate actual processing time in days
          if (application.status === 'completed') {
            const submittedDate = application.submittedAt instanceof Date ? application.submittedAt : new Date(application.submittedAt);
            const completedDate = application.updatedAt instanceof Date ? application.updatedAt : new Date(application.updatedAt);
            const diffTime = completedDate.getTime() - submittedDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return <span className="font-medium">{diffDays} days</span>;
          }
          
          // For applications still in progress
          return <span className="text-vanderbilt-gold-600 font-medium">In Progress</span>;
        })()}
      </td>
    </tr>
  );
};

const Dashboard: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  // const [selectedTimeFrame, setSelectedTimeFrame] = useState<'week' | 'month' | 'quarter'>('month');

  // Load real data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load applications, metrics, and trends in parallel
        const [applicationsResponse, metricsResponse, trendsResponse] = await Promise.all([
          applicationApi.getAll(),
          analyticsApi.getMetrics(),
          analyticsApi.getTrends()
        ]);

        const apps = applicationsResponse.data.map((app: any) => ({
          ...app,
          submittedAt: new Date(app.submittedAt),
          updatedAt: new Date(app.updatedAt),
          statusHistory: app.statusHistory?.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          })) || []
        }));

        setApplications(apps);
        setMetrics(metricsResponse.data);
        console.log('Trends response:', trendsResponse.data);
        setTrendsData(trendsResponse.data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Fallback to empty state if API fails
        setApplications([]);
        setMetrics({
          totalApplications: 0,
          applicationsByStatus: {
            'submitted': 0,
            'ccc_review': 0,
            'ccc_associate_dean_review': 0,
            'awaiting_primary_approval': 0,
            'fis_entry_pending': 0,
            'completed': 0,
            'rejected': 0
          },
          averageProcessingTime: 0,
          stalledApplications: [],
          recentActivity: []
        });
      }
    };

    loadDashboardData();
  }, []);

  // Use real trends data from API, fallback to empty array if no data
  console.log('Trends data in component:', trendsData);
  const progressData = trendsData.length > 0 ? trendsData : [];

  const statusDistributionData = metrics ? ([
    'submitted',
    'ccc_review', 
    'awaiting_primary_approval',
    'fis_entry_pending',
    'completed',
    'rejected'  // Moved to last position
  ] as AppStatus[])
    .filter(status => status in metrics.applicationsByStatus) // Only include existing statuses
    .map(status => ({
      status: status === 'awaiting_primary_approval' 
        ? 'Primary Approval' 
        : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: metrics.applicationsByStatus[status] || 0
    })) : [];

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-pulse">
          <Sparkles className="h-8 w-8 text-vanderbilt-gold-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-4xl font-display font-bold text-vanderbilt-black-900">
            Dashboard
          </h1>
          <p className="text-lg text-surface-600 mt-2 font-medium">
            Secondary Appointment Workflow Overview
          </p>
        </div>
        {/* <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <select 
            value={selectedTimeFrame}
            onChange={(e) => setSelectedTimeFrame(e.target.value as 'week' | 'month' | 'quarter')}
            className="input-modern max-w-xs"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <button className="btn-outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </button>
        </div> */}
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Applications"
          value={metrics.totalApplications}
          icon={Users}
          color="bg-gradient-to-br from-vanderbilt-navy-500 to-vanderbilt-navy-600"
        />
        <MetricCard
          title="Average Processing Time"
          value={`${Math.round(metrics.averageProcessingTime)} days`}
          icon={Clock}
          color="bg-gradient-to-br from-success-500 to-success-600"
        />
        <MetricCard
          title="Completed This Month"
          value={metrics.applicationsByStatus.completed}
          icon={CheckCircle}
          color="bg-gradient-to-br from-vanderbilt-gold-500 to-vanderbilt-gold-600"
        />
        <MetricCard
          title="Stalled Applications"
          value={metrics.stalledApplications.length}
          icon={AlertTriangle}
          color="bg-gradient-to-br from-error-500 to-error-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-semibold text-vanderbilt-black-900">
              Processing Time Trend
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
              <XAxis dataKey="month" tick={{ fill: '#71717A' }} />
              <YAxis tick={{ fill: '#71717A' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: 'none', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px -12px rgba(0, 0, 0, 0.25)'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="avgTime" 
                stroke="#F2CC0C" 
                strokeWidth={3}
                dot={{ fill: '#F2CC0C', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#F2CC0C', strokeWidth: 2, fill: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-semibold text-vanderbilt-black-900">
              Applications by Status
            </h3>
            <div className="w-3 h-3 bg-vanderbilt-gold-500 rounded-full animate-pulse-soft"></div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusDistributionData}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F2CC0C" stopOpacity={1}/>
                  <stop offset="95%" stopColor="#d99a06ff" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
              <XAxis
                dataKey="status"
                tick={{ fill: '#71717A', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: '#71717A' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px -12px rgba(0, 0, 0, 0.25)'
                }}
              />
              <Bar
                dataKey="count"
                fill="url(#colorGradient)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-surface-200 bg-gradient-to-r from-surface-50 to-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h3 className="text-2xl font-display font-semibold text-vanderbilt-black-900">
                Recent Applications
              </h3>
              <p className="text-surface-600 mt-1">Track application progress and identify bottlenecks</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-surface-500">
                <Calendar className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleString()}</span>
              </div>
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse-soft"></div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-700 uppercase tracking-wider">
                  Faculty Member
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-700 uppercase tracking-wider">
                  Current Approver
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-700 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-700 uppercase tracking-wider">
                  Days Since Update
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-700 uppercase tracking-wider">
                  Processing Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {applications.map((application) => (
                <ApplicationRow key={application.id} application={application} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;