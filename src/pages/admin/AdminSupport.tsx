
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockSupportMessages } from '@/lib/mockData';
import { format } from 'date-fns';
import { BrandIcon } from '@/components/BrandIcons';

export default function AdminSupport() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Support Client</h1>
        <p className="text-slate-500">Répondre aux sollicitations des utilisateurs</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Statut</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Dernier message</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockSupportMessages.map((msg) => (
              <TableRow key={msg.id}>
                <TableCell>
                  {msg.status === 'unread' ? (
                    <Badge className="bg-blue-600">Nouveau</Badge>
                  ) : (
                    <Badge variant="outline">Lu</Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">{msg.user_name}</TableCell>
                <TableCell>{msg.company_name}</TableCell>
                <TableCell className="max-w-[300px] truncate">{msg.message}</TableCell>
                <TableCell className="text-xs text-slate-500">{format(new Date(msg.created_at), 'dd/MM HH:mm')}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="gap-2">
                    <BrandIcon name="message" className="h-4 w-4" />
                    Répondre
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
