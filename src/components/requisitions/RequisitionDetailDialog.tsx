<<<<<<< HEAD

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Requisition,
  UserProfile,
  ActivityEntry,
  RequisitionStatus
} from '@/lib/types'
import { Permissions } from '@/hooks/usePermissions'
import { RequisitionStatusBadge } from './RequisitionStatusBadge'
import { format, differenceInHours } from 'date-fns'
import {
  Banknote,
  Calendar,
  Check,
  History,
  Info,
  User,
  X,
  Loader2,
  ShieldAlert,
  Paperclip,
  ListTodo,
  Store,
} from 'lucide-react'
import { Button } from '../ui/button'
import { doc, arrayUnion } from 'firebase/firestore'
import { useFirestore, updateDocumentNonBlocking } from '@/firebase'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '../ui/textarea'
import { useState, useEffect } from 'react'
import { ActivityFeed } from '../shared/ActivityFeed'
import { Badge } from '../ui/badge'
import Link from 'next/link'
import { AssignTaskDialog } from '../tasks/AssignTaskDialog'
import { advanceRequisition, PROCUREMENT_WORKFLOW } from '@/services/procurement'

interface RequisitionDetailDialogProps {
  requisition: Requisition
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  currentUserProfile: UserProfile
  isSuperAdmin: boolean
  permissions: Permissions
  currencySymbol: string
}

export function RequisitionDetailDialog({
  requisition,
  isOpen,
  onOpenChange,
  currentUserProfile,
  permissions,
  currencySymbol
}: RequisitionDetailDialogProps) {
  const firestore = useFirestore()
  const { toast } = useToast()
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);

  useEffect(() => {
    if (requisition.status === 'PENDING_HR' && differenceInHours(new Date(), new Date(requisition.createdAt)) > 24) {
      setIsUrgent(true);
    } else {
      setIsUrgent(false);
    }
  }, [requisition.status, requisition.createdAt]);

  const canTakeAction = () => {
    if (!currentUserProfile || !permissions) return false
    if (requisition.status === 'PAID' || requisition.status === 'REJECTED')
      return false

    const requiredPermission = PROCUREMENT_WORKFLOW[requisition.status]?.role;
    // Simple mapping check
    if (requiredPermission === 'HR_MANAGER') return permissions.canApproveHR;
    if (requiredPermission === 'FINANCE_MANAGER') return permissions.canApproveFinance;
    if (requiredPermission === 'MANAGING_DIRECTOR') return permissions.canApproveMD;
    if (requisition.status === 'APPROVED') return permissions.canDisburse;
    
    return false;
  }

  const canReject = () => {
    if (!permissions) return false;
    return permissions.canApproveHR || permissions.canApproveFinance || permissions.canApproveMD;
  }
  
  const handleAddComment = (commentText: string) => {
    if (!firestore || !currentUserProfile) return;
    const commentEntry: ActivityEntry = {
        type: 'COMMENT',
        actorId: currentUserProfile.id,
        actorName: currentUserProfile.fullName,
        timestamp: new Date().toISOString(),
        text: commentText,
    };
    const requisitionRef = doc(firestore, 'requisitions', requisition.id);
    updateDocumentNonBlocking(requisitionRef, {
        activity: arrayUnion(commentEntry),
    });
  }

  const handleAction = async (
    action: 'APPROVE' | 'REJECT' | 'PAID'
  ) => {
    if (!firestore || !currentUserProfile) return
    setIsSubmitting(true);

    try {
        await advanceRequisition(firestore, requisition, currentUserProfile, action, rejectionReason);
        toast({ title: 'Success', description: 'Requisition has been updated.' })
        onOpenChange(false)
        setRejectionReason('');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  const approvalActionText = requisition.status === 'APPROVED' ? 'Mark as Paid' : 'Approve'

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>
              {requisition.serialNo}: {requisition.title}
            </span>
            {isUrgent && (
              <Badge variant="destructive" className="gap-1.5 text-xs animate-pulse">
                <ShieldAlert className="h-3 w-3" /> URGENT
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 pt-1">
            <RequisitionStatusBadge status={requisition.status} />
            <span>
              Created by {requisition.creatorName} on{' '}
              {format(new Date(requisition.createdAt), 'PPP')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4 flex-1 overflow-y-auto">
          <div className="lg:col-span-2 space-y-6 flex flex-col">
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Info className="h-4 w-4" /> Details
              </h4>
              <p className="text-foreground">{requisition.description}</p>
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <History className="h-4 w-4" /> Activity Feed
              </h4>
              <div className="flex-1 rounded-md border p-4 bg-card/50">
                  <ActivityFeed
                    activity={requisition.activity}
                    currentUserProfile={currentUserProfile}
                    onAddComment={handleAddComment}
                    isLoading={isSubmitting}
                  />
              </div>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-4 rounded-lg border bg-secondary/30 p-4 h-fit">
            <h4 className="font-semibold border-b pb-2">Procurement Summary</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Banknote className="h-4 w-4" /> Amount
                </span>
                <span className="font-mono text-lg font-semibold text-primary">
                  {currencySymbol}{requisition.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Store className="h-4 w-4" /> Vendor
                </span>
                <span className="font-medium truncate max-w-[120px]">{requisition.vendorName || 'Not Selected'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" /> Creator
                </span>
                <span className="font-medium">{requisition.creatorName}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Paperclip className="h-4 w-4" /> Attachment
                </span>
                {requisition.attachmentUrl ? (
                    <Link href={requisition.attachmentUrl} target="_blank" rel="noopener noreferrer" className='font-medium text-primary hover:underline truncate max-w-[120px]'>
                        {requisition.attachmentName || 'View File'}
                    </Link>
                ) : (
                    <span className="font-medium text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {(requisition.status === 'APPROVED' || requisition.status === 'PAID') && (
                <Button variant="outline" onClick={() => setIsAssignTaskOpen(true)}>
                    <ListTodo className="mr-2 h-4 w-4" /> Create Workflow Task
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {canTakeAction() && (
                <>
                  {canReject() && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isSubmitting}>
                          <X className="mr-2 h-4 w-4" /> Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Provide a reason for rejecting this requisition. This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Textarea
                          placeholder="Type your reason here..."
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleAction('REJECT')}
                            disabled={!rejectionReason || isSubmitting}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Confirm Rejection
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  <Button
                    variant="default"
                    onClick={() =>
                      handleAction(
                        requisition.status === 'APPROVED'
                          ? 'PAID'
                          : 'APPROVE'
                      )
                    }
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Check className="mr-2 h-4 w-4" /> {approvalActionText}
                  </Button>
                </>
              )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
     {isOpen && (
        <AssignTaskDialog
            open={isAssignTaskOpen}
            onOpenChange={setIsAssignTaskOpen}
            currentUserProfile={currentUserProfile}
            permissions={permissions}
            initialData={{
                title: `Procurement: ${requisition.serialNo}`,
                description: `Follow up task for requisition: "${requisition.title}".`,
                priority: 'LEVEL_2',
            }}
        />
     )}
    </>
  )
}
=======

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Requisition,
  UserProfile,
  ActivityEntry,
  RequisitionStatus
} from '@/lib/types'
import { Permissions } from '@/hooks/usePermissions'
import { RequisitionStatusBadge } from './RequisitionStatusBadge'
import { format, differenceInHours } from 'date-fns'
import {
  Banknote,
  Calendar,
  Check,
  History,
  Info,
  User,
  X,
  Loader2,
  ShieldAlert,
  Paperclip,
  ListTodo,
  Store,
} from 'lucide-react'
import { Button } from '../ui/button'
import { doc, arrayUnion } from 'firebase/firestore'
import { useFirestore, updateDocumentNonBlocking } from '@/firebase'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '../ui/textarea'
import { useState, useEffect } from 'react'
import { ActivityFeed } from '../shared/ActivityFeed'
import { Badge } from '../ui/badge'
import Link from 'next/link'
import { AssignTaskDialog } from '../tasks/AssignTaskDialog'
import { advanceRequisition, PROCUREMENT_WORKFLOW } from '@/services/procurement'

interface RequisitionDetailDialogProps {
  requisition: Requisition
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  currentUserProfile: UserProfile
  isSuperAdmin: boolean
  permissions: Permissions
  currencySymbol: string
}

export function RequisitionDetailDialog({
  requisition,
  isOpen,
  onOpenChange,
  currentUserProfile,
  permissions,
  currencySymbol
}: RequisitionDetailDialogProps) {
  const firestore = useFirestore()
  const { toast } = useToast()
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);

  useEffect(() => {
    if (requisition.status === 'PENDING_HR' && differenceInHours(new Date(), new Date(requisition.createdAt)) > 24) {
      setIsUrgent(true);
    } else {
      setIsUrgent(false);
    }
  }, [requisition.status, requisition.createdAt]);

  const canTakeAction = () => {
    if (!currentUserProfile || !permissions) return false
    if (requisition.status === 'PAID' || requisition.status === 'REJECTED')
      return false

    const requiredPermission = PROCUREMENT_WORKFLOW[requisition.status]?.role;
    // Simple mapping check
    if (requiredPermission === 'HR_MANAGER') return permissions.canApproveHR;
    if (requiredPermission === 'FINANCE_MANAGER') return permissions.canApproveFinance;
    if (requiredPermission === 'MANAGING_DIRECTOR') return permissions.canApproveMD;
    if (requisition.status === 'APPROVED') return permissions.canDisburse;
    
    return false;
  }

  const canReject = () => {
    if (!permissions) return false;
    return permissions.canApproveHR || permissions.canApproveFinance || permissions.canApproveMD;
  }
  
  const handleAddComment = (commentText: string) => {
    if (!firestore || !currentUserProfile) return;
    const commentEntry: ActivityEntry = {
        type: 'COMMENT',
        actorId: currentUserProfile.id,
        actorName: currentUserProfile.fullName,
        timestamp: new Date().toISOString(),
        text: commentText,
    };
    const requisitionRef = doc(firestore, 'requisitions', requisition.id);
    updateDocumentNonBlocking(requisitionRef, {
        activity: arrayUnion(commentEntry),
    });
  }

  const handleAction = async (
    action: 'APPROVE' | 'REJECT' | 'PAID'
  ) => {
    if (!firestore || !currentUserProfile) return
    setIsSubmitting(true);

    try {
        await advanceRequisition(firestore, requisition, currentUserProfile, action, rejectionReason);
        toast({ title: 'Success', description: 'Requisition has been updated.' })
        onOpenChange(false)
        setRejectionReason('');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  const approvalActionText = requisition.status === 'APPROVED' ? 'Mark as Paid' : 'Approve'

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>
              {requisition.serialNo}: {requisition.title}
            </span>
            {isUrgent && (
              <Badge variant="destructive" className="gap-1.5 text-xs animate-pulse">
                <ShieldAlert className="h-3 w-3" /> URGENT
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 pt-1">
            <RequisitionStatusBadge status={requisition.status} />
            <span>
              Created by {requisition.creatorName} on{' '}
              {format(new Date(requisition.createdAt), 'PPP')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4 flex-1 overflow-y-auto">
          <div className="lg:col-span-2 space-y-6 flex flex-col">
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Info className="h-4 w-4" /> Details
              </h4>
              <p className="text-foreground">{requisition.description}</p>
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <History className="h-4 w-4" /> Activity Feed
              </h4>
              <div className="flex-1 rounded-md border p-4 bg-card/50">
                  <ActivityFeed
                    activity={requisition.activity}
                    currentUserProfile={currentUserProfile}
                    onAddComment={handleAddComment}
                    isLoading={isSubmitting}
                  />
              </div>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-4 rounded-lg border bg-secondary/30 p-4 h-fit">
            <h4 className="font-semibold border-b pb-2">Procurement Summary</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Banknote className="h-4 w-4" /> Amount
                </span>
                <span className="font-mono text-lg font-semibold text-primary">
                  {currencySymbol}{requisition.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Store className="h-4 w-4" /> Vendor
                </span>
                <span className="font-medium truncate max-w-[120px]">{requisition.vendorName || 'Not Selected'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" /> Creator
                </span>
                <span className="font-medium">{requisition.creatorName}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Paperclip className="h-4 w-4" /> Attachment
                </span>
                {requisition.attachmentUrl ? (
                    <Link href={requisition.attachmentUrl} target="_blank" rel="noopener noreferrer" className='font-medium text-primary hover:underline truncate max-w-[120px]'>
                        {requisition.attachmentName || 'View File'}
                    </Link>
                ) : (
                    <span className="font-medium text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {(requisition.status === 'APPROVED' || requisition.status === 'PAID') && (
                <Button variant="outline" onClick={() => setIsAssignTaskOpen(true)}>
                    <ListTodo className="mr-2 h-4 w-4" /> Create Workflow Task
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {canTakeAction() && (
                <>
                  {canReject() && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isSubmitting}>
                          <X className="mr-2 h-4 w-4" /> Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Provide a reason for rejecting this requisition. This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Textarea
                          placeholder="Type your reason here..."
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleAction('REJECT')}
                            disabled={!rejectionReason || isSubmitting}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Confirm Rejection
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  <Button
                    variant="default"
                    onClick={() =>
                      handleAction(
                        requisition.status === 'APPROVED'
                          ? 'PAID'
                          : 'APPROVE'
                      )
                    }
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Check className="mr-2 h-4 w-4" /> {approvalActionText}
                  </Button>
                </>
              )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
     {isOpen && (
        <AssignTaskDialog
            open={isAssignTaskOpen}
            onOpenChange={setIsAssignTaskOpen}
            currentUserProfile={currentUserProfile}
            permissions={permissions}
            initialData={{
                title: `Procurement: ${requisition.serialNo}`,
                description: `Follow up task for requisition: "${requisition.title}".`,
                priority: 'LEVEL_2',
            }}
        />
     )}
    </>
  )
}
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
