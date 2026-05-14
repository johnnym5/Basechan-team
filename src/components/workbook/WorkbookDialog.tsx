'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from '@/firebase';
import { doc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import type { UserProfile, Workbook, Sheet } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ShieldAlert, BookCopy, MoreHorizontal, Edit, Trash2, Share2, Search, PlusCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { EditWorkbookDialog } from '@/components/workbook/EditWorkbookDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { ShareWorkbookDialog } from '@/components/workbook/ShareWorkbookDialog';
import WorkbookDetailPage from '@/components/workbook/WorkbookDetailPage';
import { Input } from '@/components/ui/input';
import { NewWorkbookDialog } from './NewWorkbookDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { usePermissions, type Permissions } from '@/hooks/usePermissions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function WorkbookCard({ 
    workbook, 
    userProfile, 
    permissions,
    onSelectSheet,
    onEdit,
    onShare,
    onDelete,
 }: { 
    workbook: Workbook, 
    userProfile: UserProfile, 
    permissions: Permissions,
    onSelectSheet: (workbookId: string, sheetId: string | null) => void,
    onEdit: (workbook: Workbook) => void,
    onShare: (workbook: Workbook) => void,
    onDelete: (workbook: Workbook) => void,
}) {
    const firestore = useFirestore();
    const sheetsQuery = useMemoFirebase(() => 
        firestore ? collection(firestore, `workbooks/${workbook.id}/sheets`) : null
    , [firestore, workbook.id]);
    const { data: sheets, isLoading } = useCollection<Sheet>(sheetsQuery);

    const recordCount = sheets?.[0]?.data?.length ?? 0;
    const firstSheetId = sheets?.[0]?.id ?? null;

    const handleViewRecords = () => {
        onSelectSheet(workbook.id, firstSheetId);
    };
    
    const canManage = (workbook: Workbook) => {
        if (permissions.canManageStaff) return true;
        if (workbook.createdBy === userProfile.id) return true;
        const sharingInfo = workbook.sharedWith?.find(s => s.userId === userProfile.id);
        return sharingInfo?.role === 'MANAGER';
    }

    return (
        <Card className="group bg-card/50 hover:bg-card/90 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base font-semibold leading-tight line-clamp-1">{workbook.title}</CardTitle>
                 {canManage(workbook) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2 opacity-50 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onShare(workbook)}>
                                <Share2 className="mr-2 h-4 w-4" />
                                <span>Share</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(workbook)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(workbook)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>
            <CardContent className="py-2 flex-grow flex flex-col justify-center">
                <div className="flex items-center justify-between">
                    <div>
                        {isLoading ? <Skeleton className="h-10 w-12" /> : <p className="text-4xl font-bold font-headline">{recordCount}</p>}
                        <p className="text-xs text-muted-foreground tracking-widest">ASSET RECORDS</p>
                    </div>
                     <BookCopy className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>VERIFICATION</span>
                        <span>0 / {recordCount}</span>
                    </div>
                    <Progress value={0} className="h-1" />
                </div>
            </CardContent>
            <CardFooter>
                 <Button variant="outline" className="w-full" onClick={handleViewRecords}>
                    View Records <ArrowRight className="ml-2 h-4 w-4" />
                 </Button>
            </CardFooter>
        </Card>
    );
}

function WorkbookList({ userProfile, onSelectSheet }: { userProfile: UserProfile, onSelectSheet: (workbookId: string, sheetId: string | null) => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [workbookToEdit, setWorkbookToEdit] = useState<Workbook | null>(null);
    const [workbookToDelete, setWorkbookToDelete] = useState<Workbook | null>(null);
    const [workbookToShare, setWorkbookToShare] = useState<Workbook | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const permissions = usePermissions(userProfile);
    const [isDeleting, setIsDeleting] = useState(false);

    const workbooksQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'workbooks'),
            where('visibleTo', 'array-contains', userProfile.id)
        )
    }, [firestore, userProfile]);

    const { data: workbooks, isLoading } = useCollection<Workbook>(workbooksQuery);

    const filteredWorkbooks = useMemo(() => {
        if (!workbooks) return [];
        if (!searchTerm) return workbooks;
        return workbooks.filter(wb =>
            wb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wb.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [workbooks, searchTerm]);

    const groupedWorkbooks = useMemo(() => {
        if (!filteredWorkbooks) return {};
        return filteredWorkbooks.reduce((acc, wb) => {
            const ownerName = wb.creatorName;
            (acc[ownerName] = acc[ownerName] || []).push(wb);
            return acc;
        }, {} as Record<string, Workbook[]>);
    }, [filteredWorkbooks]);


    const handleDelete = async () => {
        if (!workbookToDelete || !firestore) return;
        setIsDeleting(true);

        const workbookRef = doc(firestore, 'workbooks', workbookToDelete.id);
        const sheetsRef = collection(firestore, `workbooks/${workbookToDelete.id}/sheets`);

        try {
            const sheetsSnapshot = await getDocs(sheetsRef);
            const batch = writeBatch(firestore);

            sheetsSnapshot.forEach(sheetDoc => {
                batch.delete(sheetDoc.ref);
            });
            
            batch.delete(workbookRef);

            await batch.commit();

            toast({ title: "Workbook Deleted", description: `"${workbookToDelete.title}" and all its sheets have been removed.` });

        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: `Could not delete workbook. Error: ${error.message}`,
            });
        } finally {
            setIsDeleting(false);
            setWorkbookToDelete(null);
        }
    };

    if (isLoading) {
        return (
            <>
                <div className="relative mb-4">
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-56" />)}
                </div>
            </>
        )
    }

    return (
        <>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search workbooks by title or description..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {Object.keys(groupedWorkbooks).length === 0 ? (
                 <div className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg text-center h-64">
                    <BookCopy className="w-12 h-12 text-muted-foreground" />
                    <p className="mt-4 text-lg font-semibold">{searchTerm ? 'No Workbooks Found' : 'No Workbooks Yet'}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{searchTerm ? 'Try a different search term.' : 'Get started by creating your first workbook.'}</p>
                </div>
            ) : (
                 <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(groupedWorkbooks)}>
                    {Object.entries(groupedWorkbooks).map(([creatorName, userWorkbooks]) => (
                         <AccordionItem key={creatorName} value={creatorName} className="border-none bg-secondary/30 rounded-lg">
                            <AccordionTrigger className="p-4 hover:no-underline hover:bg-secondary/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback>{creatorName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold text-left">{creatorName}</h3>
                                        <p className="text-sm text-muted-foreground text-left">{userWorkbooks.length} workbook(s)</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {userWorkbooks.map(workbook => (
                                        <WorkbookCard
                                            key={workbook.id}
                                            workbook={workbook}
                                            userProfile={userProfile}
                                            permissions={permissions}
                                            onSelectSheet={onSelectSheet}
                                            onEdit={setWorkbookToEdit}
                                            onShare={setWorkbookToShare}
                                            onDelete={setWorkbookToDelete}
                                        />
                                    ))}
                                </div>
                            </AccordionContent>
                         </AccordionItem>
                    ))}
                </Accordion>
            )}

            {workbookToEdit && (
                <EditWorkbookDialog
                    open={!!workbookToEdit}
                    onOpenChange={(isOpen) => !isOpen && setWorkbookToEdit(null)}
                    workbook={workbookToEdit}
                />
            )}
             {workbookToShare && userProfile && (
                <ShareWorkbookDialog
                    open={!!workbookToShare}
                    onOpenChange={(isOpen) => !isOpen && setWorkbookToShare(null)}
                    workbook={workbookToShare}
                    currentUserProfile={userProfile}
                />
            )}

            {workbookToDelete && (
                <AlertDialog open={!!workbookToDelete} onOpenChange={(isOpen) => !isOpen && setWorkbookToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the workbook "{workbookToDelete.title}" and all of its sheets.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    )
}

function WorkbookDialogContent({ initialPayload }: { initialPayload?: { workbookId?: string; sheetId?: string | null; } }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const [viewingWorkbookId, setViewingWorkbookId] = useState<string | null>(null);
  const [initialSheetId, setInitialSheetId] = useState<string | null>(null);
  const [isNewWorkbookOpen, setIsNewWorkbookOpen] = useState(false);

  useEffect(() => {
    if (initialPayload?.workbookId) {
        setViewingWorkbookId(initialPayload.workbookId);
        setInitialSheetId(initialPayload.sheetId || null);
    }
  }, [initialPayload]);

  const userProfileRef = useMemoFirebase(() => 
    firestore && authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const handleSelectSheet = (workbookId: string, sheetId: string | null) => {
    setViewingWorkbookId(workbookId);
    setInitialSheetId(sheetId);
  }

  if (isProfileLoading) {
    return <div className="p-6"><Skeleton className="h-full w-full" /></div>
  }

  if (!userProfile) {
      return (
           <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
              <p className="text-muted-foreground mt-2">Could not identify user profile.</p>
            </div>
      )
  }
  
  if (viewingWorkbookId) {
      return <WorkbookDetailPage 
                workbookId={viewingWorkbookId} 
                initialSheetId={initialSheetId}
                onBack={() => {
                    setViewingWorkbookId(null)
                    setInitialSheetId(null);
                }} 
            />;
  }

  return (
    <div className="space-y-6 p-6 min-h-full">
       <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Workbooks</h1>
          <p className="text-muted-foreground">
            Create, manage, and distribute work from master documents.
          </p>
         </div>
         <NewWorkbookDialog open={isNewWorkbookOpen} onOpenChange={setIsNewWorkbookOpen} userProfile={userProfile}>
            <Button onClick={() => setIsNewWorkbookOpen(true)}>
                <PlusCircle className="mr-2"/>
                New Workbook
            </Button>
        </NewWorkbookDialog>
       </div>
       <WorkbookList userProfile={userProfile} onSelectSheet={handleSelectSheet} />
    </div>
  );
}

export function WorkbookDialog({ open, onOpenChange, initialPayload }: { open: boolean, onOpenChange: (open: boolean) => void, initialPayload?: any }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>Data Grid Workstation</DialogTitle>
            <DialogDescription>
              Analyze and manage organizational data units.
            </DialogDescription>
          </DialogHeader>
        </div>
        <ScrollArea className="flex-1">
            <WorkbookDialogContent initialPayload={initialPayload} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
