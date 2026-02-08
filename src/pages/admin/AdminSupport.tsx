import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function AdminSupport() {
  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_messages')
        .select(`
          *,
          companies ( name ),
          profiles ( full_name )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

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
            {messages?.map((msg) => (
              <TableRow key={msg.id}>
                <TableCell>
                  {!msg.read_at && msg.is_from_support === false ? (
                    <Badge className="bg-blue-600">Nouveau</Badge>
                  ) : (
                    <Badge variant="outline">Lu</Badge>
                                      )}
                </TableCell>
                <TableCell className="font-medium">{msg.profiles?.full_name}</TableCell>
                <TableCell>{msg.companies?.name}</TableCell>
                <TableCell className="max-w-[300px] truncate" title={msg.message}>{msg.message}</TableCell>
                <TableCell className="text-xs text-slate-500">{format(new Date(msg.created_at), 'dd/MM HH:mm')}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Répondre
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {messages?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun message</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
                      }
