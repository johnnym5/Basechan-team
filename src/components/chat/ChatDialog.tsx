

"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { UserProfile, Chat, ChatMessage, Notification } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Loader2, PlusCircle, Hash, MessageSquare, MoreVertical, Trash2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { cn, sanitizeInput } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CreateChannelDialog } from './CreateChannelDialog';
import { Separator } from '../ui/separator';
import { type Permissions } from '@/hooks/usePermissions';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';


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

    const messagesQuery = useMemoFirebase(() => 
        query(collection(firestore, 'chats', chat.id, 'messages'), orderBy('timestamp', 'asc'))
    , [firestore, chat.id]);
    const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

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

    return (
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
                {messages.map(message => {
                    const isCurrentUser = message.senderId === currentUserProfile.id;
                    return (
                        <div key={message.id} className={cn("flex items-end gap-2", isCurrentUser ? "justify-end" : "justify-start")}>
                             {!isCurrentUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{message.senderName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                "max-w-xs md:max-w-md rounded-lg px-3 py-2 text-sm", 
                                isCurrentUser ? "bg-primary text-primary-foreground" : "bg-secondary"
                            )}>
                                <p>{message.content}</p>
                                <p className={cn("text-xs mt-1", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                    {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                                </p>
                            </div>
                            {isCurrentUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{currentUserProfile.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                            )}
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
    query(collection(firestore, 'chats'), where('participants', 'array-contains', currentUserProfile.id), orderBy('updatedAt', 'desc'))
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

  const handleSendMessage = async () => {
    if (!selectedChat || !message.trim() || !firestore) return;
    setIsSending(true);

    const now = new Date().toISOString();

    const chatRef = doc(firestore, 'chats', selectedChat.id);
    const messageRef = collection(firestore, 'chats', selectedChat.id, 'messages');
    const notificationsRef = collection(firestore, 'notifications');


    const messageData: Omit<ChatMessage, 'id'> = {
        chatId: selectedChat.id,
        orgId: currentUserProfile.orgId,
        senderId: currentUserProfile.id,
        senderName: currentUserProfile.fullName,
        content: sanitizeInput(message),
        timestamp: now,
    };
    
    try {
        await addDocumentNonBlocking(messageRef, messageData);
        
        // Update last message on chat doc
        const chatUpdateData = {
            lastMessage: {
                text: messageData.content,
                senderId: messageData.senderId,
                senderName: messageData.senderName,
                timestamp: now,
            },
            updatedAt: now,
            ...(!selectedChat.lastMessage && { 
              participants: selectedChat.participants,
              participantProfiles: selectedChat.participantProfiles,
              orgId: selectedChat.orgId,
              type: selectedChat.type,
            })
        }
        await setDocumentNonBlocking(chatRef, chatUpdateData, { merge: true });

        // Create notifications for other participants
        selectedChat.participants.forEach(participantId => {
            if (participantId !== currentUserProfile.id) {
                const notification: Omit<Notification, 'id'> = {
                    orgId: currentUserProfile.orgId,
                    userId: participantId,
                    title: `New message from ${currentUserProfile.fullName}`,
                    description: messageData.content,
                    href: `/chat?chatId=${selectedChat.id}`,
                    isRead: false,
                    createdAt: now,
                };
                addDocumentNonBlocking(notificationsRef, notification);
            }
        });

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
      <SheetContent side="left" className="sm:max-w-2xl w-full p-0 flex flex-col">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle>Internal Chat</SheetTitle>
          <SheetDescription>
            Communicate with your team via channels and direct messages.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 grid grid-cols-3 overflow-hidden">
            <div className="col-span-1 border-r flex flex-col">
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between px-2">
                             <h4 className="font-semibold text-sm">Channels</h4>
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsCreateChannelOpen(true)}><PlusCircle className="h-4 w-4" /></Button>
                           </div>
                           {isLoading && Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                           {channels.map(chat => (
                               <div key={chat.id} onClick={() => setSelectedChat(chat)} className={cn("p-2 rounded-lg cursor-pointer flex justify-between items-start", selectedChat?.id === chat.id ? "bg-secondary" : "hover:bg-secondary")}>
                                   <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground"/> <p className="font-semibold truncate">{chat.name}</p></div>
                                        <p className="text-xs text-muted-foreground truncate">{chat.lastMessage?.text}</p>
                                   </div>
                                    {(permissions.canManageAnnouncements || chat.createdBy === currentUserProfile.id) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={e => e.stopPropagation()}><MoreVertical className="h-4 w-4"/></Button>
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
                        <Separator />
                        <div className="space-y-2">
                           <h4 className="font-semibold text-sm px-2">Direct Messages</h4>
                           {isLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                           {directMessages.map(chat => (
                               <div key={chat.id} onClick={() => setSelectedChat(chat)} className={cn("p-2 rounded-lg cursor-pointer hover:bg-secondary", selectedChat?.id === chat.id && "bg-secondary")}>
                                   <div className="flex items-center gap-2">
                                       <Avatar className="h-8 w-8"><AvatarFallback>{getDirectMessageTitle(chat).split(' ').map(n=>n[0]).join('')}</AvatarFallback></Avatar>
                                       <div>
                                            <p className="font-semibold truncate">{getDirectMessageTitle(chat)}</p>
                                            <p className="text-xs text-muted-foreground truncate">{chat.lastMessage?.text}</p>
                                       </div>
                                   </div>
                               </div>
                           ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>
            <div className="col-span-2 flex flex-col">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b">
                            <h3 className="font-semibold">
                                {selectedChat.type === 'CHANNEL' ? `# ${selectedChat.name}` : getDirectMessageTitle(selectedChat)}
                            </h3>
                        </div>
                        <ChatMessages chat={selectedChat} currentUserProfile={currentUserProfile} />
                        <div className="p-4 border-t flex items-center gap-2">
                            <Input 
                                placeholder="Type your message..." 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isSending) {
                                        handleSendMessage();
                                    }
                                }}
                                disabled={isSending}
                            />
                            <Button onClick={handleSendMessage} disabled={isSending || !message.trim()}>
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <p>Select a conversation to begin.</p>
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
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the channel #{channelToDelete.name}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteChannel} className="bg-destructive hover:bg-destructive/90">Delete Channel</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}
