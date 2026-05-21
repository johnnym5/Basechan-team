"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserProfile, Chat, ChatMessage, Notification } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Loader2, PlusCircle, Hash, MessageSquare, MoreVertical, Trash2, CheckCheck, History, Terminal } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { cn, sanitizeInput } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CreateChannelDialog } from './CreateChannelDialog';
import { type Permissions } from '@/hooks/usePermissions';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { chatService } from '@/services/chat-service';


interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
  permissions: Permissions;
  initialPayload?: { initialUserId?: string; chatId?: string };
  modal?: boolean;
}

function ChatMessages({ chat, currentUserProfile }: { chat: Chat, currentUserProfile: UserProfile }) {
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
                <p className="text-xs font-black uppercase tracking-widest text-center">Encrypted Channel Established<br/>Awaiting Transmissions</p>
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
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
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
                            Load {messages.length - 15} Previous Transmissions
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
                                <div className={cn(
                                    "rounded-[1.5rem] px-4 py-3 text-sm shadow-sm leading-relaxed", 
                                    isCurrentUser 
                                        ? "bg-primary text-primary-foreground rounded-br-none" 
                                        : "bg-secondary/50 backdrop-blur-md rounded-bl-none border border-white/5"
                                )}>
                                    <p>{message.content}</p>
                                </div>
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

export function ChatDialog({ open, onOpenChange, currentUserProfile, permissions, initialPayload, modal = false }: ChatDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Chat | null>(null);

  const chatsQuery = useMemoFirebase(() => 
    query(collection(firestore!, 'chats'), where('participants', 'array-contains', currentUserProfile.id), orderBy('updatedAt', 'desc'))
  , [firestore, currentUserProfile.id]);
  const { data: chats, isLoading } = useCollection<Chat>(chatsQuery);

  const { channels, directMessages } = useMemo(() => {
    if (!chats) return { channels: [], directMessages: [] };
    const ch: Chat[] = [];
    const dm: Chat[] = [];
    chats.forEach(c => c.type === 'CHANNEL' ? ch.push(c) : dm.push(c));
    return { channels: ch, directMessages: dm };
  }, [chats]);
  
  useEffect(() => {
    if (!open || !chats) return;

    let chatToSelect: Chat | null = null;

    if (initialPayload?.chatId) {
        chatToSelect = chats.find(c => c.id === initialPayload.chatId) || null;
    } else if (initialPayload?.initialUserId) {
        const userId = initialPayload.initialUserId;
        const dmId = [currentUserProfile.id, userId].sort().join('_');
        
        const existingDM = directMessages.find(dm => dm.id === dmId);
        if (existingDM) {
            chatToSelect = existingDM;
        } else {
             chatToSelect = {
                id: dmId,
                orgId: currentUserProfile.orgId,
                type: 'DIRECT',
                participants: [currentUserProfile.id, userId],
                participantProfiles: {
                    [currentUserProfile.id]: { fullName: currentUserProfile.fullName },
                    [userId]: { fullName: "Loading..." }
                },
                updatedAt: new Date().toISOString()
            };
        }
    }
    
    if (chatToSelect) {
      setSelectedChat(chatToSelect);
    }
    
  }, [open, initialPayload, chats, directMessages, currentUserProfile]);

  useEffect(() => {
      if (open && selectedChat && firestore) {
          chatService.markAsRead(firestore, selectedChat.id, currentUserProfile.id);
      }
  }, [open, selectedChat?.id, selectedChat?.updatedAt, firestore, currentUserProfile.id]);

  const handleSendMessage = async () => {
    if (!selectedChat || !message.trim() || !firestore) return;
    setIsSending(true);
    
    try {
        await chatService.sendMessage(firestore, selectedChat, currentUserProfile, message);
        setMessage('');
    } catch(e) {
        console.error("Failed to send message: ", e);
    } finally {
        setIsSending(false);
    }
  }
  
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
    }
    setChannelToDelete(null);
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent position="left" className="p-0 flex flex-col apple-glass border-none overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Internal Comms Terminal</DialogTitle>
          <DialogDescription>Secure organizational messaging hub.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden h-full">
            {/* Sidebar Pane */}
            <div className="col-span-1 md:col-span-4 lg:col-span-3 border-r border-white/5 flex flex-col bg-secondary/10 backdrop-blur-xl">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-2xl font-black font-headline tracking-tighter">Comms Hub</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Organizational Transmissions</p>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-8">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between px-2 mb-2">
                             <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary opacity-70">Operational Channels</h4>
                             <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg bg-primary/10 text-primary" onClick={() => setIsCreateChannelOpen(true)}><PlusCircle className="h-3.5 w-3.5" /></Button>
                           </div>
                           <div className="space-y-1">
                                {isLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                                {channels.map(chat => (
                                    <div 
                                        key={chat.id} 
                                        onClick={() => setSelectedChat(chat)} 
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
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Terminate Node
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                ))}
                           </div>
                        </div>

                        <div className="space-y-2">
                           <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary opacity-70 px-2 mb-2">Personnel Transmissions</h4>
                           <div className="space-y-1">
                                {isLoading && Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                                {directMessages.map(chat => (
                                    <div 
                                        key={chat.id} 
                                        onClick={() => setSelectedChat(chat)} 
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
                                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                                <p className="font-bold text-sm truncate">{getDirectMessageTitle(chat)}</p>
                                                <p className={cn("text-[9px] font-medium truncate opacity-60", selectedChat?.id === chat.id && "opacity-80")}>
                                                    {chat.lastMessage?.text || "Secure Link Active"}
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
            <div className="col-span-1 md:col-span-8 lg:col-span-9 flex flex-col bg-background/50 relative">
                {selectedChat ? (
                    <>
                        <div className="p-6 border-b border-white/5 bg-background/40 backdrop-blur-xl flex items-center justify-between sticky top-0 z-20">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                                    {selectedChat.type === 'CHANNEL' ? <Hash className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg font-headline leading-none">
                                        {selectedChat.type === 'CHANNEL' ? selectedChat.name : getDirectMessageTitle(selectedChat)}
                                    </h3>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mt-1">
                                        {selectedChat.type === 'CHANNEL' ? `${selectedChat.participants.length} Units Connected` : 'Peer-to-Peer Encryption Active'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <ChatMessages chat={selectedChat} currentUserProfile={currentUserProfile} />

                        <div className="p-6 border-t border-white/5 bg-background/40 backdrop-blur-xl">
                            <div className="max-w-4xl mx-auto flex items-center gap-3 bg-secondary/30 rounded-[2rem] p-2 pr-3 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                <Input 
                                    placeholder="Dispatch transmission..." 
                                    className="border-none bg-transparent focus-visible:ring-0 h-12 text-sm pl-4"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !isSending && message.trim()) {
                                            handleSendMessage();
                                        }
                                    }}
                                    disabled={isSending}
                                />
                                <Button size="icon" onClick={handleSendMessage} disabled={isSending || !message.trim()} className="rounded-2xl h-10 w-10 shrink-0">
                                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
                        <div className="p-8 rounded-[3rem] bg-secondary/20 border-2 border-dashed border-white/5 mb-8 animate-pulse">
                            <Terminal className="h-16 w-16 opacity-10" />
                        </div>
                        <h3 className="text-xl font-black font-headline text-foreground uppercase tracking-widest">Awaiting Command</h3>
                        <p className="text-xs max-w-xs mt-3 leading-relaxed opacity-50 uppercase font-bold tracking-tighter">Select an organizational node or personnel identity from the sidebar to establish a secure transmission link.</p>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
    
    <CreateChannelDialog 
        open={isCreateChannelOpen} 
        onOpenChange={setIsCreateChannelOpen} 
        currentUserProfile={currentUserProfile}
    />
    
    {channelToDelete && (
        <AlertDialog open={!!channelToDelete} onOpenChange={(isOpen) => !isOpen && setChannelToDelete(null)}>
            <AlertDialogContent className="apple-glass-darker border-none rounded-[2.5rem] p-8">
                <AlertDialogHeader className="space-y-4">
                    <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit">
                        <Trash2 className="h-8 w-8 text-destructive" />
                    </div>
                    <div className="text-center">
                        <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter">Terminate Channel?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 leading-relaxed">
                            This will permanently remove the channel <span className="text-foreground">#{channelToDelete.name}</span> and purge all associated transmission history from the infrastructure.
                        </AlertDialogDescription>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-6">
                    <AlertDialogAction onClick={handleDeleteChannel} className="w-full h-14 bg-destructive text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-95">Confirm Termination</AlertDialogAction>
                    <AlertDialogCancel className="w-full h-10 border-none text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-transparent transition-all">Abort Command</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}
