import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Loader2, User, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  message: string;
  is_from_support: boolean | null;
  created_at: string;
  read_at: string | null;
}

const Support = () => {
  const { companyUser, user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['support-messages', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return [];
      
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!companyUser?.company_id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!companyUser?.company_id) return;

    const channel = supabase
      .channel('support-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `company_id=eq.${companyUser.company_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-messages', companyUser.company_id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyUser?.company_id, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!messages || !companyUser?.company_id || !user) return;

    const unreadFromSupport = messages.filter(m => m.is_from_support && !m.read_at);
    if (unreadFromSupport.length > 0) {
      supabase
        .from('support_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadFromSupport.map(m => m.id))
        .then();
    }
  }, [messages, companyUser?.company_id, user]);

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!companyUser?.company_id || !user) throw new Error('Not authenticated');

      const { error } = await supabase.from('support_messages').insert({
        company_id: companyUser.company_id,
        user_id: user.id,
        message,
        is_from_support: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['support-messages', companyUser?.company_id] });
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-muted-foreground">
          Échangez avec notre équipe support
        </p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.is_from_support ? 'justify-start' : 'justify-end'
                    )}
                  >
                    {msg.is_from_support && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Headphones className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-4 py-2',
                        msg.is_from_support
                          ? 'bg-muted'
                          : 'bg-primary text-primary-foreground'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p
                        className={cn(
                          'text-xs mt-1',
                          msg.is_from_support ? 'text-muted-foreground' : 'text-primary-foreground/70'
                        )}
                      >
                        {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                    {!msg.is_from_support && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
                <p>Aucun message</p>
                <p className="text-sm">Commencez la conversation !</p>
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="Tapez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[60px] resize-none"
                rows={2}
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMutation.isPending}
                className="shrink-0"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;
