
export interface MockCompany {
  id: string;
  name: string;
  siret: string;
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
}

export interface MockUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  company_name: string;
  created_at: string;
}

export interface MockImport {
  id: string;
  company_name: string;
  file_name: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
}

export interface MockSupportMessage {
  id: string;
  company_name: string;
  user_name: string;
  message: string;
  created_at: string;
  status: 'read' | 'unread';
}

export const mockCompanies: MockCompany[] = [
  { id: '1', name: 'Tech Solutions SAS', siret: '12345678901234', status: 'active', created_at: '2025-01-15T10:00:00Z' },
  { id: '2', name: 'Global Logistics SARL', siret: '98765432109876', status: 'active', created_at: '2025-02-01T08:30:00Z' },
  { id: '3', name: 'Green Energy Corp', siret: '55566677788899', status: 'pending', created_at: '2025-02-10T14:20:00Z' },
  { id: '4', name: 'Future Media', siret: '11122233344455', status: 'suspended', created_at: '2024-12-20T11:15:00Z' },
];

export const mockUsers: MockUser[] = [
  { id: '1', email: 'john@techsolutions.com', full_name: 'John Doe', role: 'admin', company_name: 'Tech Solutions SAS', created_at: '2025-01-15T10:05:00Z' },
  { id: '2', email: 'alice@techsolutions.com', full_name: 'Alice Smith', role: 'user', company_name: 'Tech Solutions SAS', created_at: '2025-01-16T09:00:00Z' },
  { id: '3', email: 'bob@globallogistics.com', full_name: 'Bob Martin', role: 'admin', company_name: 'Global Logistics SARL', created_at: '2025-02-01T08:35:00Z' },
  { id: '4', email: 'charlie@greenenergy.com', full_name: 'Charlie Brown', role: 'admin', company_name: 'Green Energy Corp', created_at: '2025-02-10T14:25:00Z' },
];

export const mockImports: MockImport[] = [
  { id: '1', company_name: 'Tech Solutions SAS', file_name: 'q1_results.xlsx', status: 'completed', created_at: '2025-01-20T16:00:00Z' },
  { id: '2', company_name: 'Global Logistics SARL', file_name: 'inventory_feb.csv', status: 'completed', created_at: '2025-02-05T10:30:00Z' },
  { id: '3', company_name: 'Tech Solutions SAS', file_name: 'payroll_jan.xlsx', status: 'pending', created_at: '2025-02-12T09:15:00Z' },
  { id: '4', company_name: 'Green Energy Corp', file_name: 'energy_report.xlsx', status: 'failed', created_at: '2025-02-11T15:45:00Z' },
];

export const mockSupportMessages: MockSupportMessage[] = [
  { id: '1', company_name: 'Tech Solutions SAS', user_name: 'John Doe', message: 'Comment puis-je modifier mon SIRET ?', created_at: '2025-02-10T11:00:00Z', status: 'unread' },
  { id: '2', company_name: 'Global Logistics SARL', user_name: 'Bob Martin', message: 'L\'import de mon fichier a échoué.', created_at: '2025-02-11T14:30:00Z', status: 'read' },
  { id: '3', company_name: 'Future Media', user_name: 'Jane Smith', message: 'Mon compte est suspendu, pourquoi ?', created_at: '2025-02-12T08:00:00Z', status: 'unread' },
];
