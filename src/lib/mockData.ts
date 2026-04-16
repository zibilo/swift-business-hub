
export interface MockCompany {
  id: string;
  name: string;
  siret: string;
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
}

export interface MockUser {
  id: string;
  full_name: string;
  email: string;
  company_name: string;
  role: 'admin' | 'user';
  last_login: string;
}

export interface MockImport {
  id: string;
  file_name: string;
  company_name: string;
  period: string;
  row_count: number;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  is_read: boolean;
  is_update: boolean;
}

export interface MockSupportMessage {
  id: string;
  user_name: string;
  company_name: string;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
}

export const mockCompanies: MockCompany[] = [
  { id: '1', name: 'MUCODEC Brazzaville', siret: '12345678901234', status: 'active', created_at: '2024-01-10T10:00:00Z' },
  { id: '2', name: 'TotalEnergies Congo', siret: '98765432109876', status: 'active', created_at: '2024-01-15T11:30:00Z' },
  { id: '3', name: 'Congo Telecom', siret: '55566677788899', status: 'pending', created_at: '2024-02-01T09:00:00Z' },
];

export const mockUsers: MockUser[] = [
  { id: '1', full_name: 'Jean Dupont', email: 'j.dupont@mucodec.cg', company_name: 'MUCODEC Brazzaville', role: 'admin', last_login: '2024-02-08T15:45:00Z' },
  { id: '2', full_name: 'Marie Claire', email: 'm.claire@total.cg', company_name: 'TotalEnergies Congo', role: 'user', last_login: '2024-02-07T10:20:00Z' },
];

export const mockImports: MockImport[] = [
  { id: 'IMP-001', file_name: 'flux_paie_janv2024.xlsx', company_name: 'MUCODEC Brazzaville', period: '202401', row_count: 1250, status: 'completed', created_at: '2024-01-31T23:59:00Z', is_read: true, is_update: false },
  { id: 'IMP-002', file_name: 'rectif_total_janv.csv', company_name: 'TotalEnergies Congo', period: '202401', row_count: 45, status: 'completed', created_at: '2024-02-05T14:10:00Z', is_read: false, is_update: true },
];

export const mockSupportMessages: MockSupportMessage[] = [
  { id: '1', user_name: 'Jean Dupont', company_name: 'MUCODEC Brazzaville', message: 'Impossible d\'importer mon fichier XLSB.', status: 'unread', created_at: '2024-02-08T08:30:00Z' },
  { id: '2', user_name: 'Marie Claire', company_name: 'TotalEnergies Congo', message: 'Comment modifier mon SIRET ?', status: 'read', created_at: '2024-02-06T11:00:00Z' },
];
