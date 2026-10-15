import { AlbumType, UserRole } from "@prisma/client";

export interface CollegeDivision {
  name: string;
  departments: string[];
}

export interface SmartFlowProjectSummary {
  id: string;
  smartflowId: string;
  projectCode: string;
  projectName: string;
  academicYear: number;
  budgetYear: number;
  divisionName: string;
  departmentName?: string | null;
  ownerTeacherName: string;
  ownerEmail: string;
  projectStatus: string;
}

export interface AlbumFilterParams {
  search?: string;
  albumType?: AlbumType;
  academicYear?: number;
  semester?: number;
  divisionName?: string;
  departmentName?: string;
  hasProject?: boolean;
  page?: number;
  limit?: number;
}

export interface PhotoSyncApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
