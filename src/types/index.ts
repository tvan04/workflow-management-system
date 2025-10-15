export type ApplicationStatus = 
  | 'submitted'
  | 'ccc_review'
  | 'faculty_vote'
  | 'awaiting_primary_approval'
  | 'approved'
  | 'rejected'
  | 'fis_entry_pending'
  | 'completed';

export type InstitutionalAffiliation = 'vanderbilt' | 'vumc';

export type UserRole = 'faculty' | 'ccc_staff' | 'dean' | 'chair' | 'admin';

export interface FacultyMember {
  id: string;
  name: string;
  email: string;
  department: string;
  college: string;
  institution: InstitutionalAffiliation;
  title: string;
}

export interface ApprovalChain {
  departmentChair?: {
    name: string;
    email: string;
  };
  divisionChair?: {
    name: string;
    email: string;
  };
  dean: {
    name: string;
    email: string;
  };
  seniorAssociateDean?: {
    name: string;
    email: string;
  };
  hasDepartments: boolean;
}

export interface Application {
  id: string;
  facultyMember: FacultyMember;
  approvalChain: ApprovalChain;
  status: ApplicationStatus;
  submittedAt: Date;
  updatedAt: Date;
  cvFile?: File | string;
  rationale: string;
  statusHistory: StatusHistoryItem[];
  currentApprover?: string;
  fisEntered: boolean;
  fisEntryDate?: Date;
  processingTimeWeeks?: number;
}

export interface StatusHistoryItem {
  status: ApplicationStatus;
  timestamp: Date;
  approver?: string;
  notes?: string;
}

export interface DashboardMetrics {
  totalApplications: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  averageProcessingTime: number;
  stalledApplications: Application[];
  recentActivity: StatusHistoryItem[];
}

export interface College {
  id: string;
  name: string;
  hasDepartments: boolean;
  departments?: Department[];
  dean: ContactInfo;
  seniorAssociateDean?: ContactInfo;
}

export interface Department {
  id: string;
  name: string;
  chair: ContactInfo;
  divisionChair?: ContactInfo;
}

export interface ContactInfo {
  name: string;
  email: string;
  title: string;
}