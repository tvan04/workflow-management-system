// Mock data for development and testing
import { Application, College, DashboardMetrics, ApplicationStatus } from '../types';

export const mockColleges: College[] = [
  {
    id: '1',
    name: 'School of Engineering',
    hasDepartments: true,
    dean: {
      name: 'Dr. Patricia Williams',
      email: 'patricia.williams@vanderbilt.edu',
      title: 'Dean'
    },
    departments: [
      {
        id: '1',
        name: 'Computer Science',
        chair: {
          name: 'Dr. Robert Chen',
          email: 'robert.chen@vanderbilt.edu',
          title: 'Department Chair'
        }
      },
      {
        id: '2',
        name: 'Biomedical Engineering',
        chair: {
          name: 'Dr. Lisa Anderson',
          email: 'lisa.anderson@vanderbilt.edu',
          title: 'Department Chair'
        }
      }
    ]
  },
  {
    id: '2',
    name: 'School of Medicine',
    hasDepartments: true,
    dean: {
      name: 'Dr. Jennifer Davis',
      email: 'jennifer.davis@vumc.org',
      title: 'Dean'
    }
  },
  {
    id: '3',
    name: 'Owen Graduate School of Management',
    hasDepartments: false,
    dean: {
      name: 'Dr. Eric Johnson',
      email: 'eric.johnson@vanderbilt.edu',
      title: 'Dean'
    }
  },
  {
    id: '4',
    name: 'Blair School of Music',
    hasDepartments: false,
    dean: {
      name: 'Dr. Mark Wait',
      email: 'mark.wait@vanderbilt.edu',
      title: 'Dean'
    }
  },
  {
    id: '5',
    name: 'School of Nursing',
    hasDepartments: false,
    dean: {
      name: 'Dr. Susan Miller',
      email: 'susan.miller@vanderbilt.edu',
      title: 'Dean'
    }
  },
  {
    id: '6',
    name: 'Divinity School',
    hasDepartments: false,
    dean: {
      name: 'Dr. Michael Thompson',
      email: 'michael.thompson@vanderbilt.edu',
      title: 'Dean'
    }
  }
];

export const mockApplications: Application[] = [
  {
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
    submittedAt: new Date('2024-09-15'),
    updatedAt: new Date('2024-10-01'),
    rationale: 'I am seeking a secondary appointment in CCC to collaborate on AI/ML research projects that align with both my expertise in computer vision and CCC\'s mission of advancing connected computing solutions.',
    statusHistory: [
      {
        status: 'submitted',
        timestamp: new Date('2024-09-15T09:00:00'),
        notes: 'Application submitted successfully'
      },
      {
        status: 'ccc_review',
        timestamp: new Date('2024-09-18T14:30:00'),
        approver: 'CCC Dean\'s Office',
        notes: 'CV and rationale reviewed, approved for next stage'
      }
    ],
    currentApprover: 'Dr. Robert Chen (Department Chair)',
    fisEntered: false,
    processingTimeWeeks: 3
  },
  {
    id: 'APP-2024-002',
    facultyMember: {
      id: '2',
      name: 'Dr. Michael Brown',
      email: 'michael.brown@vumc.org',
      department: 'Biomedical Informatics',
      college: 'Medicine',
      institution: 'vumc',
      title: 'Professor'
    },
    approvalChain: {
      dean: { name: 'Dr. Jennifer Davis', email: 'jennifer.davis@vumc.org' },
      hasDepartments: false
    },
    status: 'ccc_review',
    submittedAt: new Date('2024-10-01'),
    updatedAt: new Date('2024-10-03'),
    rationale: 'My research in healthcare AI and digital health platforms would benefit significantly from a secondary appointment in CCC, allowing for enhanced collaboration on connected health solutions.',
    statusHistory: [
      {
        status: 'submitted',
        timestamp: new Date('2024-10-01T11:15:00'),
        notes: 'Application submitted successfully'
      }
    ],
    fisEntered: false,
    processingTimeWeeks: 1
  },
  {
    id: 'APP-2024-003',
    facultyMember: {
      id: '3',
      name: 'Dr. Emily Davis',
      email: 'emily.davis@vanderbilt.edu',
      department: 'Psychology',
      college: 'Arts & Science',
      institution: 'vanderbilt',
      title: 'Assistant Professor'
    },
    approvalChain: {
      departmentChair: { name: 'Dr. James Wilson', email: 'james.wilson@vanderbilt.edu' },
      dean: { name: 'Dr. Margaret Foster', email: 'margaret.foster@vanderbilt.edu' },
      hasDepartments: true
    },
    status: 'awaiting_primary_approval',
    submittedAt: new Date('2024-08-20'),
    updatedAt: new Date(),
    rationale: 'My work on human-computer interaction and digital behavior research aligns well with CCC\'s interdisciplinary approach to connected computing research.',
    statusHistory: [
      {
        status: 'submitted',
        timestamp: new Date('2024-08-20T10:30:00'),
        notes: 'Application submitted successfully'
      },
      {
        status: 'ccc_review',
        timestamp: new Date('2024-08-22T15:45:00'),
        approver: 'CCC Dean\'s Office',
        notes: 'CV and rationale reviewed, approved for next stage'
      },
      {
        status: 'awaiting_primary_approval',
        timestamp: new Date('2024-08-25T09:20:00'),
        approver: 'Dr. James Wilson',
        notes: 'Department chair approval received'
      },
      {
        status: 'fis_entry_pending',
        timestamp: new Date('2024-09-25T16:10:00'),
        approver: 'Dr. Margaret Foster',
        notes: 'Dean approval received - appointment approved'
      },
      {
        status: 'awaiting_primary_approval',
        timestamp: new Date(),
        approver: 'Admin',
        notes: 'Status changed back to Primary Approval for review'
      }
    ],
    currentApprover: 'Dr. James Wilson (Department Chair)',
    fisEntered: false,
    processingTimeWeeks: 5
  },
  {
    id: 'APP-2024-004',
    facultyMember: {
      id: '4',
      name: 'Dr. David Kim',
      email: 'david.kim@vanderbilt.edu',
      department: 'Management',
      college: 'Owen Graduate School of Management',
      institution: 'vanderbilt',
      title: 'Professor'
    },
    approvalChain: {
      dean: { name: 'Dr. Eric Johnson', email: 'eric.johnson@vanderbilt.edu' },
      hasDepartments: false
    },
    status: 'completed',
    submittedAt: new Date('2024-07-10'),
    updatedAt: new Date('2024-08-15'),
    rationale: 'My expertise in technology management and digital transformation would contribute to CCC\'s research on the business applications of connected computing.',
    statusHistory: [
      {
        status: 'submitted',
        timestamp: new Date('2024-07-10T14:00:00'),
        notes: 'Application submitted successfully'
      },
      {
        status: 'ccc_review',
        timestamp: new Date('2024-07-12T11:30:00'),
        approver: 'CCC Dean\'s Office',
        notes: 'CV and rationale reviewed, approved for next stage'
      },
      {
        status: 'awaiting_primary_approval',
        timestamp: new Date('2024-07-15T13:45:00'),
        approver: 'Dr. Eric Johnson',
        notes: 'Dean approval received'
      },
      {
        status: 'fis_entry_pending',
        timestamp: new Date('2024-08-01T09:15:00'),
        notes: 'All approvals complete'
      },
      {
        status: 'fis_entry_pending',
        timestamp: new Date('2024-08-05T10:20:00'),
        notes: 'FIS entry in progress'
      },
      {
        status: 'completed',
        timestamp: new Date('2024-08-15T16:30:00'),
        notes: 'Secondary appointment active in FIS'
      }
    ],
    fisEntered: true,
    processingTimeWeeks: 2
  }
];

export const mockMetrics: DashboardMetrics = {
  totalApplications: 47,
  applicationsByStatus: {
    'submitted': 8,
    'ccc_review': 12,
    'awaiting_primary_approval': 15,
    'fis_entry_pending': 10,
    'completed': 0,
    'rejected': 2
  },
  averageProcessingTime: 4.2,
  stalledApplications: mockApplications.filter(app => {
    const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(app.updatedAt).getTime()) / (1000 * 3600 * 24));
    return daysSinceUpdate > 7;
  }),
  recentActivity: [
    {
      status: 'fis_entry_pending',
      timestamp: new Date('2024-10-13T14:30:00'),
      approver: 'Dr. Jennifer Davis',
      notes: 'VUMC faculty appointment approved'
    },
    {
      status: 'ccc_review',
      timestamp: new Date('2024-10-13T11:15:00'),
      notes: 'New application under review'
    },
    {
      status: 'completed',
      timestamp: new Date('2024-10-12T16:45:00'),
      notes: 'FIS entry completed for recent appointment'
    }
  ]
};

export const mockProcessingTrends = [
  { month: 'Jun', avgTime: 8.5, applications: 3 },
  { month: 'Jul', avgTime: 7.2, applications: 8 },
  { month: 'Aug', avgTime: 6.1, applications: 12 },
  { month: 'Sep', avgTime: 5.3, applications: 15 },
  { month: 'Oct', avgTime: 4.2, applications: 9 }
];

// Utility function to generate more mock applications
export const generateMockApplications = (count: number): Application[] => {
  const statuses: ApplicationStatus[] = [
    'submitted',
    'ccc_review',
    'awaiting_primary_approval',
    'fis_entry_pending',
    'completed'
  ];

  const departments = [
    'Computer Science', 'Biomedical Engineering', 'Psychology', 
    'Management', 'Medicine', 'Nursing', 'Music', 'Divinity'
  ];

  const colleges = mockColleges.map(c => c.name);

  return Array.from({ length: count }, (_, i) => {
    const id = `APP-2024-${String(i + 100).padStart(3, '0')}`;
    const submittedDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
    const updatedDate = new Date(submittedDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    return {
      id,
      facultyMember: {
        id: String(i + 100),
        name: `Dr. Test Faculty ${i + 100}`,
        email: `faculty${i + 100}@vanderbilt.edu`,
        department: departments[Math.floor(Math.random() * departments.length)],
        college: colleges[Math.floor(Math.random() * colleges.length)],
        institution: Math.random() > 0.7 ? 'vumc' : 'vanderbilt' as const,
        title: Math.random() > 0.5 ? 'Professor' : 'Associate Professor'
      },
      approvalChain: {
        dean: { name: 'Dr. Random Dean', email: 'dean@vanderbilt.edu' },
        hasDepartments: Math.random() > 0.3
      },
      status: statuses[Math.floor(Math.random() * statuses.length)],
      submittedAt: submittedDate,
      updatedAt: updatedDate,
      rationale: 'Mock rationale for testing purposes.',
      statusHistory: [],
      fisEntered: Math.random() > 0.8
    } as Application;
  });
};