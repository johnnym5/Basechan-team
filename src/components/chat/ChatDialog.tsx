"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { UserProfile, Chat, ChatMessage, Notification } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Loader2, PlusCircle, Hash, MessageSquare, MoreVertical, Trash2, CheckCheck, History } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { cn, sanitizeInput } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CreateChannelDialog } from './CreateChannelDialog';
import { Separator } from '../ui/separator';
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
        return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
    }

    if (!messages || messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
            </div>
        )
    }

    const hasHiddenMessages = messages.length > 5 && !showAll;
    const displayedMessages = hasHiddenMessages ? messages.slice(-5) : messages;

    const getReadStatus = (message: ChatMessage) => {
        if (message.senderId !== currentUserProfile.id) return null;
        
        const readers = chat.participants
            .filter(p => p !== currentUserProfile.id)
            .filter(p => chat.readReceipts?.[p] && new Date(chat.readReceipts[p]) >= new Date(message.timestamp));

        if (readers.length === 0) return null;

        return (
            <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                <CheckCheck className="h-3 w-3" />
                <span>Read {readers.length > 1 ? `by ${readers.length}` : ''}</span>
            </div>
        )
    }

    return (
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
                {hasHiddenMessages && (
                    <div className="flex justify-center pb-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowAll(true)}
                            className="rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-secondary/30 hover:bg-primary/10 hover:text-primary transition-all group"
                        >
                            <History className="h-3 w-3 mr-2 group-hover:rotate-[-45deg] transition-transform" />
                            Load {messages.length - 5} Previous Transmissions
                        </Button>
                    </div>
                )}
                {displayedMessages.map(message => {
                    const isCurrentUser = message.senderId === currentUserProfile.id;
                    return (
                        <div key={message.id} className={cn("flex items-end gap-2 animate-slide-up-fade", isCurrentUser ? "justify-end" : "justify-start")}>
                             {!isCurrentUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{message.senderName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                "max-w-[70%] md:max-w-md rounded-2xl px-4 py-2 text-sm shadow-sm", 
                                isCurrentUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary rounded-bl-none"
                            )}>
                                <p className="leading-relaxed">{message.content}</p>
                                <div className="flex items-center justify-between gap-4 mt-1">
                                    <p className={cn("text-[10px] font-medium opacity-60")}>
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

export function ChatDialog({ open, onOpenChange, currentUserProfile, permissions, initialPayload }: ChatDialogProps) {
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

  // Handle Mark as Read
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="sm:max-w-2xl w-full p-0 flex flex-col apple-glass border-none">
        <SheetHeader className="p-6 pb-4 border-b border-white/5">
          <SheetTitle className="text-2xl font-bold font-headline">Internal Chat</SheetTitle>
          <SheetDescription>
            Communicate securely with your organizational units.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 grid grid-cols-3 overflow-hidden">
            <div className="col-span-1 border-r border-white/5 flex flex-col bg-secondary/10">
                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-6">
                        <div className="space-y-1">
                           <div className="flex items-center justify-between px-2 mb-2">
                             <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Channels</h4>
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsCreateChannelOpen(true)}><PlusCircle className="h-4 w-4" /></Button>
                           </div>
                           {isLoading && Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-1" />)}
                           {channels.map(chat => (
                               <div key={chat.id} onClick={() => setSelectedChat(chat)} className={cn("p-2 rounded-xl cursor-pointer flex justify-between items-start transition-all", selectedChat?.id === chat.id ? "bg-primary/10 text-primary" : "hover:bg-white/5")}>
                                   <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center gap-2"><Hash className="h-3 w-3 opacity-50"/> <p className="font-bold text-xs truncate">{chat.name}</p></div>
                                        <p className="text-[10px] opacity-60 truncate mt-0.5">{chat.lastMessage?.text}</p>
                                   </div>
                                    {(permissions.canManageAnnouncements || chat.createdBy === currentUserProfile.id) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={e => e.stopPropagation()}><MoreVertical className="h-3 w-3"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent onClick={e => e.stopPropagation()}>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setChannelToDelete(chat)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Channel
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                               </div>
                           ))}
                        </div>
                        <div className="space-y-1">
                           <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">Direct</h4>
                           {isLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-1" />)}
                           {directMessages.map(chat => (
                               <div key={chat.id} onClick={() => setSelectedChat(chat)} className={cn("p-2 rounded-xl cursor-pointer transition-all", selectedChat?.id === chat.id ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-white/5")}>
                                   <div className="flex items-center gap-3">
                                       <Avatar className="h-8 w-8 border border-white/10"><AvatarFallback className="text-[10px] font-bold bg-secondary">{getDirectMessageTitle(chat).split(' ').map(n=>n[0]).join('')}</AvatarFallback></Avatar>
                                       <div className="flex-1 min-w-0">
                                            <p className="font-bold text-xs truncate">{getDirectMessageTitle(chat)}</p>
                                            <p className="text-[10px] opacity-60 truncate">{chat.lastMessage?.text || 'Start conversation'}</p>
                                       </div>
                                   </div>
                               </div>
                           ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>
            <div className="col-span-2 flex flex-col bg-background/50">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b border-white/5 bg-background/20 backdrop-blur-md flex items-center justify-between">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                {selectedChat.type === 'CHANNEL' ? <Hash className="h-4 w-4 text-primary" /> : <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                                {selectedChat.type === 'CHANNEL' ? selectedChat.name : getDirectMessageTitle(selectedChat)}
                            </h3>
                        </div>
                        <ChatMessages chat={selectedChat} currentUserProfile={currentUserProfile} />
                        <div className="p-4 border-t border-white/5">
                            <div className="flex items-center gap-2 bg-secondary/30 rounded-2xl p-1 pr-2">
                                <Input 
                                    placeholder="Secure transmission..." 
                                    className="border-none bg-transparent focus-visible:ring-0 h-10 text-sm"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !isSending && message.trim()) {
                                            handleSendMessage();
                                        }
                                    }}
                                    disabled={isSending}
                                />
                                <Button size="icon" onClick={handleSendMessage} disabled={isSending || !message.trim()} className="rounded-xl h-8 w-8">
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                        <div className="p-4 rounded-full bg-secondary/30 mb-4">
                            <MessageSquare className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="font-bold text-foreground">Personnel Secure Messaging</p>
                        <p className="text-xs max-w-[200px] mt-1">Select a unit or staff member to begin encrypted communication.</p>
                    </div>
                )}
            </div>
        </div>
      </SheetContent>
    </Sheet>
    
    <CreateChannelDialog 
        open={isCreateChannelOpen} 
        onOpenChange={setIsCreateChannelOpen} 
        currentUserProfile={currentUserProfile}
    />
    
    {channelToDelete && (
        <AlertDialog open={!!channelToDelete} onOpenChange={(isOpen) => !isOpen && setChannelToDelete(null)}>
            <AlertDialogContent className="apple-glass-darker border-none">
                <AlertDialogHeader>
                    <AlertDialogTitle>Terminate Channel?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the channel #{channelToDelete.name} and all associated telemetry.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Abort</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteChannel} className="bg-destructive hover:bg-destructive/90">Confirm Termination</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}
