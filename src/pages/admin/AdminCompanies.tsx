import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockCompanies, MockCompany } from '@/lib/mockData';
import { BrandIcon } from '@/components/BrandIcons';

export default function AdminCompanies() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = mockCompanies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.siret.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Actif</Badge>;
      case 'pending': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">En attente</Badge>;
      case 'suspended': return <Badge variant="destructive">Suspendu</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Entreprises</h1>
          <p className="text-slate-500">Gérer les accès des partenaires</p>
        </div>
        <Button className="gap-2 bg-[#004080]">
          <BrandIcon name="add" className="h-4 w-4" />
          Nouvelle Entreprise
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <BrandIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom ou SIRET..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom de l'entreprise</TableHead>
              <TableHead>SIRET</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.map((company: MockCompany) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.siret}</TableCell>
                <TableCell>{getStatusBadge(company.status)}</TableCell>
                <TableCell>{new Date(company.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm">
                      <BrandIcon name="edit" className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600">
                      <BrandIcon name="delete" className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
