'use client';

import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A collection of reusable UI components to handle standard data states:
 * Loading, Success, Error, and Empty. These are styled to match the application's
 * dark, "secure terminal" aesthetic.
 */

// --- Loading State ---
interface LoadingStateProps {
    message?: string;
    className?: string;
}

export function LoadingState({ message = "Loading data...", className }: LoadingStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center text-center p-12", className)}>
            <div className="relative flex items-center justify-center h-24 w-24">
                <div className="absolute h-full w-full bg-primary/20 rounded-full animate-ping opacity-30"></div>
                <div className="absolute h-16 w-16 bg-primary/30 rounded-full animate-ping opacity-50 delay-150"></div>
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest mt-8 text-muted-foreground">{message}</p>
        </div>
    );
}

// --- Data State Wrapper ---
interface DataStateWrapperProps<T> {
    isLoading: boolean;
    error?: Error | string | null;
    data?: T[] | null;
    children: React.ReactNode;

    // Loading state props
    loadingType?: 'spinner' | 'skeleton';
    loadingMessage?: string;
    skeletonComponent?: React.ReactNode;

    // Error state props
    onRetry?: () => void;

    // Empty state props
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: React.ReactNode;
    emptyAction?: React.ReactNode;

    // Wrapper class name for the state displays
    className?: string;
}

export function DataStateWrapper<T>({
    isLoading,
    error,
    data,
    children,
    loadingType = 'spinner',
    loadingMessage,
    skeletonComponent,
    onRetry,
    emptyTitle = "No Data Found",
    emptyDescription = "There is nothing to display at the moment.",
    emptyIcon,
    emptyAction,
    className,
}: DataStateWrapperProps<T>) {
    if (isLoading) {
        if (loadingType === 'skeleton' && skeletonComponent) {
            return <>{skeletonComponent}</>;
        }
        return <LoadingState message={loadingMessage} className={className} />;
    }

    if (error) {
        const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || "An unknown error occurred.";
        return <ErrorState errorMessage={errorMessage} onRetry={onRetry} className={className} />;
    }

    if (!data || data.length === 0) {
        return <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} action={emptyAction} className={className} />;
    }

    return <>{children}</>;
}

// --- Success State ---
interface SuccessStateProps {
    title: string;
    message: string;
    className?: string;
}

export function SuccessState({ title, message, className }: SuccessStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center text-center p-12", className)}>
            <div className="p-4 rounded-full bg-emerald-500/10 mb-6">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold font-headline uppercase tracking-widest">{title}</h3>
            <p className="text-sm max-w-sm mt-2 font-medium text-muted-foreground">{message}</p>
        </div>
    );
}

// --- Error State ---
interface ErrorStateProps {
    errorMessage: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({ errorMessage, onRetry, className }: ErrorStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center text-center p-12 bg-destructive/5 border-2 border-dashed border-destructive/20 rounded-[2rem]", className)}>
            <div className="p-4 rounded-full bg-destructive/10 mb-6">
                <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="text-xl font-bold font-headline uppercase tracking-widest text-destructive">Operation Failed</h3>
            <p className="text-sm max-w-sm mt-2 font-medium text-destructive/80">{errorMessage}</p>
            {onRetry && (
                <Button onClick={onRetry} variant="destructive" className="mt-8 h-12 px-8 rounded-xl font-black uppercase tracking-widest">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                </Button>
            )}
        </div>
    );
}

// --- Empty State ---
interface EmptyStateProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ title, description, icon = <Inbox className="h-20 w-20" />, action, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-20 text-center opacity-50 border-2 border-dashed rounded-[3rem] bg-secondary/10", className)}>
            <div className="mb-6 opacity-50">{icon}</div>
            <h3 className="text-xl font-bold font-headline uppercase tracking-widest">{title}</h3>
            <p className="text-sm max-w-xs mt-2 font-medium text-muted-foreground">{description}</p>
            {action && <div className="mt-8">{action}</div>}
        </div>
    );
}