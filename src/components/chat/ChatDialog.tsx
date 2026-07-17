"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserProfile, Chat, ChatMessage, Task, Requisition } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useDatabase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, limit } from 'firebase/firestore';
import { ref, onValue, off } from 'firebase/database';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Loader2, PlusCircle, Hash, MessageSquare, MoreVertical, Trash2, CheckCheck, History, Terminal, Paperclip, ArrowRight, ListTodo, Briefcase, ChevronLeft, ShieldAlert } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { cn, sanitizeInput } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { type Permissions } from '@/hooks/usePermissions';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { chatService } from '@/services/chat-service';
import { uiEmitter } from '@/lib/ui-emitter';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useMediaQuery } from '@/hooks/use-media-query';

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
  permissions: Permissions;
  initialPayload?: { initialUserId?: string; chatId?: string };
  modal?: boolean;
}

function AssetPreview({ asset }: { asset: ChatMessage['asset'] }) {
    if (!asset) return null;
    const Icon = asset.type === 'TASK' ? ListTodo : Briefcase;
    
    const handleNavigate = () => {
        if (asset.type === 'TASK') {
            uiEmitter.emit('open-tasks-dialog', { taskId: asset.id });
        } else {
            uiEmitter.emit('open-requisitions-dialog', { reqId: asset.id });
        }
    };

    return (
        <div 
            onClick={handleNavigate}
            className="mt-3 p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between cursor-pointer hover:bg-primary/20 transition-all group"
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                    <Icon className="h-4 w-4" />
                </div>
                <div className="truncate">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary opacity-70">Shared {asset.type}</p>
                    <p className="text-xs font-bold truncate">{asset.title}</p>
                    {asset.serialNo && <p className="text-[8px] font-mono opacity-50">{asset.serialNo}</p>}
                </div>
            </div>
            <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
        </div>
    );
}

function ChatMessages({ chat, currentUserProfile, onConvertTask }: { chat: Chat, currentUserProfile: UserProfile, onConvertTask: (msg: ChatMessage) => void }) {
    const firestore = useFirestore();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [showAll, setShowAll] = useState(false);

    const messagesQuery = useMemoFirebase(() => 
        query(collection(firestore!, 'chats', chat.id, 'messages'), orderBy('timestamp', 'asc'))
    , [firestore, chat.id]);
    const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages, showAll]);

    if (isLoading) {
        return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
    }

    if (!messages || messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                <Terminal className="h-12 w-12 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-center">Secure Chat Started<br/>Awaiting Messages</p>
            </div>
        )
    }

    const hasHiddenMessages = messages.length > 15 && !showAll;
    const displayedMessages = hasHiddenMessages ? messages.slice(-15) : messages;

    const getReadStatus = (message: ChatMessage) => {
        if (message.senderId !== currentUserProfile.id) return null;
        
        const readers = chat.participants
            .filter(p => p !== currentUserProfile.id)
            .filter(p => chat.readReceipts?.[p] && new Date(chat.readReceipts[p]) >= new Date(message.timestamp));

        if (readers.length === 0) return null;

        return (
            <div className="flex items-center gap-1 mt-1 text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                <CheckCheck className="h-2.5 w-2.5" />
                <span>Read</span>
            </div>
        )
    }

    return (
        <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
            <div className="p-6 space-y-6">
                {hasHiddenMessages && (
                    <div className="flex justify-center pb-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowAll(true)}
                            className="rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-secondary/30 hover:bg-primary/10 hover:text-primary transition-all group"
                        >
                            <History className="h-3 w-3 mr-2 group-hover:rotate-[-45deg] transition-transform" />
                            Load {messages.length - 15} Previous Messages
                        </Button>
                    </div>
                )}
                {displayedMessages.map(message => {
                    const isCurrentUser = message.senderId === currentUserProfile.id;
                    return (
                        <div key={message.id} className={cn("flex items-end gap-3 animate-slide-up-fade", isCurrentUser ? "flex-row-reverse" : "flex-row")}>
                             {!isCurrentUser && (
                                <Avatar className="h-8 w-8 border border-white/5">
                                    <AvatarFallback className="bg-secondary font-bold text-[10px]">{message.senderName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className="flex flex-col gap-1 max-w-[75%]">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className={cn(
                                            "rounded-[1.5rem] px-4 py-3 text-sm shadow-sm leading-relaxed cursor-pointer transition-all active:scale-[0.98]", 
                                            isCurrentUser 
                                                ? "bg-primary text-primary-foreground rounded-br-none hover:bg-primary/90" 
                                                : "bg-secondary/50 backdrop-blur-xl rounded-bl-none border border-white/5 hover:bg-secondary/70"
                                        )}>
                                            <p>{message.content}</p>
                                            <AssetPreview asset={message.asset} />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isCurrentUser ? 'end' : 'start'} className="apple-glass-darker border-none">
                                        <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest" onSelect={() => onConvertTask(message)}>
                                            <ListTodo className="mr-2 h-3.5 w-3.5 text-primary" /> Convert to Task
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <div className={cn("flex items-center gap-3 px-1", isCurrentUser ? "justify-end" : "justify-start")}>
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                                    </p>
                                    {getReadStatus(message)}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </ScrollArea>
    )
}

function AssetPicker({ onPick }: { onPick: (asset: ChatMessage['asset']) => void }) {
    const firestore = useFirestore();
    const { user } = useUser();
    
    const tasksQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'tasks'), where('assignedTo', '==', user?.uid), limit(10)) : null
    , [firestore, user?.uid]);
    const { data: tasks } = useCollection<Task>(tasksQuery);

    const reqsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'requisitions'), where('createdBy', '==', user?.uid), limit(10)) : null
    , [firestore, user?.uid]);
    const { data: reqs } = useCollection<Requisition>(reqsQuery);

    return (
        <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid grid-cols-2 bg-secondary/30 rounded-xl p-1 mb-4">
                <TabsTrigger value="tasks" className="rounded-lg text-[10px] font-black uppercase tracking-widest">Tasks</TabsTrigger>
                <TabsTrigger value="reqs" className="rounded-lg text-[10px] font-black uppercase tracking-widest">Requests</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-48">
                <TabsContent value="tasks" className="space-y-1 m-0">
                    {tasks?.map(t => (
                        <div key={t.id} onClick={() => onPick({ id: t.id, type: 'TASK', title: t.title, serialNo: t.serialNo })} className="p-2 rounded-lg hover:bg-primary/10 cursor-pointer flex items-center justify-between group">
                            <span className="text-xs truncate max-w-[180px]">{t.title}</span>
                            <span className="text-[8px] font-mono opacity-50 group-hover:text-primary">{t.serialNo}</span>
                        </div>
                    ))}
                    {tasks?.length === 0 && <p className="text-[10px] text-center opacity-30 py-8 uppercase font-black">No Tasks Found</p>}
                </TabsContent>
                <TabsContent value="reqs" className="space-y-1 m-0">
                    {reqs?.map(r => (
                        <div key={r.id} onClick={() => onPick({ id: r.id, type: 'REQUISITION', title: r.title, serialNo: r.serialNo })} className="p-2 rounded-lg hover:bg-primary/10 cursor-pointer flex items-center justify-between group">
                            <span className="text-xs truncate max-w-[180px]">{r.title}</span>
                            <span className="text-[8px] font-mono opacity-50 group-hover:text-primary">{r.serialNo}</span>
                        </div>
                    ))}
                    {reqs?.length === 0 && <p className="text-[10px] text-center opacity-30 py-8 uppercase font-black">No Requests Found</p>}
                </TabsContent>
            </ScrollArea>
        </Tabs>
    );
}

export function ChatDialog({ open, onOpenChange, currentUserProfile, permissions, initialPayload, modal = false }: ChatDialogProps) {
  const firestore = useFirestore();
  const database = useDatabase();
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Chat | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ChatMessage['asset'] | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const typingTimeoutRef = useRef<NodeJS.Timeout>(null);

  const chatsQuery = useMemoFirebase(() => 
    query(collection(firestore!, 'chats'), where('participants', 'array-contains', currentUserProfile.id), orderBy('updatedAt', 'desc'))
  , [firestore, currentUserProfile.id]);
  const { data: chats, isLoading: isChatsLoading } = useCollection<Chat>(chatsQuery);

  const allUsersQuery = useMemoFirebase(() => 
    query(collection(firestore!, 'users'), where('orgId', '==', currentUserProfile.orgId))
  , [firestore, currentUserProfile.orgId]);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection<UserProfile>(allUsersQuery);

  const { channels, personnelTransmissions } = useMemo(() => {
    if (!chats) return { channels: [], personnelTransmissions: [] };
    
    const ch: Chat[] = chats.filter(c => c.type === 'CHANNEL');
    const dms: Chat[] = chats.filter(c => c.type === 'DIRECT');

    if (!allUsers) return { channels: ch, personnelTransmissions: dms };

    const otherUsers = allUsers.filter(u => u.id !== currentUserProfile.id);
    
    const dmMap = new Map<string, Chat>();
    dms.forEach(dm => {
      const otherId = dm.participants.find(p => p !== currentUserProfile.id);
      if (otherId) dmMap.set(otherId, dm);
    });

    const transmissions = otherUsers.map(user => {
      const existingChat = dmMap.get(user.id);
      if (existingChat) return existingChat;

      const virtualChat: Chat = {
        id: [currentUserProfile.id, user.id].sort().join('_'),
        orgId: currentUserProfile.orgId,
        type: 'DIRECT',
        participants: [currentUserProfile.id, user.id],
        participantProfiles: {
            [currentUserProfile.id]: { fullName: currentUserProfile.fullName },
            [user.id]: { fullName: user.fullName }
        },
        updatedAt: '1970-01-01T00:00:00.000Z'
      };
      return virtualChat;
    });

    return { 
        channels: ch, 
        personnelTransmissions: transmissions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    };
  }, [chats, allUsers, currentUserProfile]);
  
  useEffect(() => {
    if (!database || !selectedChat) return;

    const typingRef = ref(database, `chats/${selectedChat.id}/typing`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const now = Date.now();
            const activeTypers = Object.entries(data)
                .filter(([uid, timestamp]) => uid !== currentUserProfile.id && now - (timestamp as number) < 5000)
                .map(([uid]) => selectedChat.participantProfiles[uid]?.fullName || 'Someone');
            setTypingUsers(activeTypers);
        } else {
            setTypingUsers([]);
        }
    });

    return () => {
        setTypingUsers([]);
        off(typingRef);
    };
  }, [database, selectedChat, currentUserProfile.id]);

  useEffect(() => {
    if (!open || !personnelTransmissions.length) return;

    let chatToSelect: Chat | null = null;

    if (initialPayload?.chatId) {
        chatToSelect = channels.find(c => c.id === initialPayload.chatId) || personnelTransmissions.find(c => c.id === initialPayload.chatId) || null;
    } else if (initialPayload?.initialUserId) {
        const userId = initialPayload.initialUserId;
        const dmId = [currentUserProfile.id, userId].sort().join('_');
        chatToSelect = personnelTransmissions.find(dm => dm.id === dmId) || null;
    }
    
    if (chatToSelect) {
      setSelectedChat(chatToSelect);
      if (isMobile) setMobileView('chat');
    }
  }, [open, initialPayload, channels, personnelTransmissions, currentUserProfile, isMobile]);

  useEffect(() => {
      const isVirtualChat = selectedChat?.updatedAt === '1970-01-01T00:00:00.000Z';

      if (open && selectedChat && firestore && !isVirtualChat) {
          chatService.markAsRead(firestore, selectedChat.id, currentUserProfile.id);
          chatService.purgeOldMessages(firestore, selectedChat.id);

          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          if (selectedChat.lastMessage && selectedChat.lastMessage.timestamp < twentyFourHoursAgo) {
              updateDocumentNonBlocking(doc(firestore, 'chats', selectedChat.id), {
                  lastMessage: null
              });
          }
      }
  }, [open, selectedChat?.id, selectedChat?.updatedAt, firestore, currentUserProfile.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setMessage(e.target.value);
      if (!database || !selectedChat) return;

      chatService.setTypingStatus(database, selectedChat.id, currentUserProfile.id, true);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
          chatService.setTypingStatus(database, selectedChat.id, currentUserProfile.id, false);
      }, 2000);
  };

  const handleSendMessage = async () => {
    if (!selectedChat || (!message.trim() && !selectedAsset) || !firestore) return;
    setIsSending(true);
    
    try {
        await chatService.sendMessage(firestore, selectedChat, currentUserProfile, message, selectedAsset || undefined);
        setMessage('');
        setSelectedAsset(null);
        if (database) chatService.setTypingStatus(database, selectedChat.id, currentUserProfile.id, false);
    } catch(e) {
        console.error("Failed to send message: ", e);
    } finally {
        setIsSending(false);
    }
  }

  const handleConvertTask = (msg: ChatMessage) => {
    onOpenChange(false);
    setTimeout(() => {
        uiEmitter.emit('open-assign-task-dialog', {
            title: `From Chat: ${msg.senderName}`,
            description: msg.content,
            priority: 'LEVEL_2'
        });
    }, 100);
  };
  
  const getDirectMessageTitle = (chat: Chat) => {
    const otherParticipantId = chat.participants.find(p => p !== currentUserProfile.id);
    if (!otherParticipantId) return "Unknown User";
    return chat.participantProfiles[otherParticipantId]?.fullName || "Unknown User";
  }

  const handleDeleteChannel = () => {
    if (!channelToDelete || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'chats', channelToDelete.id));
    toast({ title: "Channel Deleted", description: `#${channelToDelete.name} has been removed.` });
    if (selectedChat?.id === channelToDelete.id) {
        setSelectedChat(null);
        if (isMobile) setMobileView('list');
    }
    setChannelToDelete(null);
  }

  const handleSelectChat = (chat: Chat) => {
      setSelectedChat(chat);
      if (isMobile) setMobileView('chat');
  };

    if (open && !permissions.canAccessChat) {
        return (
          <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
            <DialogContent position="center" className="p-8 flex flex-col items-center justify-center text-center rounded-[2.5rem] border-none apple-glass max-w-sm">
               <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
               <h1 className="text-2xl font-bold font-headline text-white">Access Denied</h1>
               <p className="text-muted-foreground mt-2">The Chat Hub module is currently disabled for your account or organization.</p>
               <Button onClick={() => onOpenChange(false)} className="mt-6">Close</Button>
            </DialogContent>
          </Dialog>
        );
    }

    return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent position="left" className="p-0 flex flex-col apple-glass border-none overflow-hidden h-full">
        <DialogHeader className="sr-only">
          <DialogTitle>Chat Hub</DialogTitle>
          <DialogDescription>Secure messaging for the organization.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden h-full min-h-0">
            {/* Sidebar Pane */}
            <div className={cn(
                "col-span-1 md:col-span-4 lg:col-span-3 border-r border-white/5 flex flex-col bg-secondary/10 backdrop-blur-xl h-full min-h-0",
                isMobile && mobileView === 'chat' && "hidden"
            )}>
                <div className="p-6 border-b border-white/5 flex-shrink-0">
                    <h2 className="text-2xl font-black font-headline tracking-tighter">Chat Hub</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Company Messages</p>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-4 space-y-8">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between px-2 mb-2">
                             <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary opacity-70">Public Channels</h4>
                             {permissions.canSendChatMessage && (
                                 <Button 
                                    type="button"
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 rounded-lg bg-primary/10 text-primary" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        uiEmitter.emit('open-create-channel-dialog');
                                    }}
                                >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                </Button>
                             )}
                           </div>
                           <div className="space-y-1">
                                {isChatsLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                                {channels.map(chat => (
                                    <div 
                                        key={chat.id} 
                                        onClick={() => handleSelectChat(chat)} 
                                        className={cn(
                                            "p-3 rounded-2xl cursor-pointer flex justify-between items-center transition-all group active:scale-95",
                                            selectedChat?.id === chat.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-white/5"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={cn("p-2 rounded-xl bg-white/10 shrink-0", selectedChat?.id === chat.id ? "bg-white/20" : "group-hover:bg-primary/10 transition-colors")}>
                                                <Hash className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm truncate">{chat.name}</p>
                                                <p className={cn("text-[9px] font-medium truncate opacity-60", selectedChat?.id === chat.id && "opacity-80")}>
                                                    {chat.lastMessage?.text || "No activity"}
                                                </p>
                                            </div>
                                        </div>
                                        {(permissions.canManageAnnouncements || chat.createdBy === currentUserProfile.id) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                        <MoreVertical className="h-3.5 w-3.5"/>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="apple-glass-darker border-none">
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive text-[10px] font-black uppercase tracking-widest" onSelect={() => setChannelToDelete(chat)}>
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove Channel
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                ))}
                           </div>
                        </div>

                        <div className="space-y-2">
                           <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary opacity-70 px-2 mb-2">Private Messages</h4>
                           <div className="space-y-1">
                                {(isChatsLoading || isUsersLoading) && Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                                {personnelTransmissions.map(chat => (
                                    <div 
                                        key={chat.id} 
                                        onClick={() => handleSelectChat(chat)} 
                                        className={cn(
                                            "p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 active:scale-95 group",
                                            selectedChat?.id === chat.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-white/5"
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar className="h-10 w-10 border-2 border-white/5 group-hover:border-primary/20 transition-all">
                                                <AvatarFallback className={cn("text-xs font-black bg-secondary", selectedChat?.id === chat.id && "bg-white/20")}>
                                                    {getDirectMessageTitle(chat).split(' ').map(n=>n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                                <p className="font-bold text-sm truncate">{getDirectMessageTitle(chat)}</p>
                                                <p className={cn("text-[9px] font-medium truncate opacity-60", selectedChat?.id === chat.id && "opacity-80")}>
                                                    {chat.lastMessage?.text || "Conversation started"}
                                                </p>
                                        </div>
                                    </div>
                                ))}
                           </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Conversation Pane */}
            <div className={cn(
                "col-span-1 md:col-span-8 lg:col-span-9 flex flex-col bg-background/50 relative h-full min-h-0",
                isMobile && mobileView === 'list' && "hidden"
            )}>
                {selectedChat ? (
                    <>
                        <div className="p-6 border-b border-white/5 bg-background/40 backdrop-blur-xl flex items-center justify-between sticky top-0 z-20 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                {isMobile && (
                                    <Button variant="ghost" size="icon" className="mr-1 -ml-2 rounded-xl" onClick={() => setMobileView('list')}>
                                        <ChevronLeft className="h-6 w-6" />
                                    </Button>
                                )}
                                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                                    {selectedChat.type === 'CHANNEL' ? <Hash className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg font-headline leading-none">
                                        {selectedChat.type === 'CHANNEL' ? selectedChat.name : getDirectMessageTitle(selectedChat)}
                                    </h3>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mt-1">
                                        {selectedChat.type === 'CHANNEL' ? `${selectedChat.participants.length} People in chat` : 'Direct Messaging'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <ChatMessages chat={selectedChat} currentUserProfile={currentUserProfile} onConvertTask={handleConvertTask} />

                        <div className="px-6 py-4 border-t border-white/5 bg-background/40 backdrop-blur-xl flex-shrink-0">
                            {/* Typing Indicator */}
                            <div className="h-4 mb-2 ml-4">
                                {typingUsers.length > 0 && (
                                    <p className="text-[9px] font-black uppercase tracking-widest text-primary animate-pulse">
                                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                                    </p>
                                )}
                            </div>
                            
                            <div className="max-w-4xl mx-auto flex flex-col gap-3">
                                {selectedAsset && (
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-primary/10 border border-primary/20 animate-in zoom-in-95">
                                        <div className="flex items-center gap-2 truncate pr-4">
                                            <Paperclip className="h-3 w-3 text-primary" />
                                            <span className="text-[10px] font-bold truncate">Linked: {selectedAsset.title}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setSelectedAsset(null)}><Trash2 className="h-3 w-3" /></Button>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 bg-secondary/30 rounded-[2rem] p-2 pr-3 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-background/40 hover:bg-primary/10">
                                                <Paperclip className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent side="top" align="start" className="w-80 apple-glass-darker border-none p-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">Share an Item</h4>
                                            <AssetPicker onPick={(asset) => {
                                                setSelectedAsset(asset);
                                                toast({ title: 'Item Linked', description: `${asset?.type || 'Asset'} ready to send.` });
                                            }} />
                                        </PopoverContent>
                                    </Popover>
                                    
                                    <Input 
                                        placeholder={permissions.canSendChatMessage ? "Write a message..." : "Channel is read-only..."} 
                                        className="border-none bg-transparent focus-visible:ring-0 h-12 text-sm pl-2"
                                        value={message}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !isSending && (message.trim() || selectedAsset)) {
                                                handleSendMessage();
                                            }
                                        }}
                                        disabled={isSending || !permissions.canSendChatMessage}
                                    />
                                    <Button size="icon" onClick={handleSendMessage} disabled={isSending || (!message.trim() && !selectedAsset) || !permissions.canSendChatMessage} className="rounded-2xl h-10 w-10 shrink-0">
                                        {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center h-full">
                        <div className="p-8 rounded-[3rem] bg-secondary/20 border-2 border-dashed border-white/5 mb-8 animate-pulse">
                            <Terminal className="h-16 w-16 opacity-10" />
                        </div>
                        <h3 className="text-xl font-black font-headline text-foreground uppercase tracking-widest">No Chat Selected</h3>
                        <p className="text-xs max-w-xs mt-3 leading-relaxed opacity-50 uppercase font-bold tracking-tighter">Select a channel or a person from the list to start a conversation.</p>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
    
    {channelToDelete && (
        <AlertDialog open={!!channelToDelete} onOpenChange={(isOpen) => !isOpen && setChannelToDelete(null)}>
            <AlertDialogContent className="apple-glass-darker border-none rounded-[2.5rem] p-8">
                <AlertDialogHeader className="space-y-4">
                    <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit">
                        <Trash2 className="h-8 w-8 text-destructive" />
                    </div>
                    <div className="text-center">
                        <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter">Delete Channel?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 leading-relaxed">
                            This will permanently remove the channel <span className="text-foreground">#{channelToDelete.name}</span> and delete all messages.
                        </AlertDialogDescription>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-6">
                    <AlertDialogAction onClick={handleDeleteChannel} className="w-full h-14 bg-destructive text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-95">Delete Channel</AlertDialogAction>
                    <AlertDialogCancel className="w-full h-10 border-none text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-transparent transition-all">Cancel</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}