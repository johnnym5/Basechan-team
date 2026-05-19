"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X, ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

const dialogVariants = cva(
  "fixed z-[500] gap-4 bg-background/95 shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 backdrop-blur-xl",
  {
    variants: {
      position: {
        center: "left-[50%] top-[50%] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border p-5 duration-200 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl max-h-[90vh] overflow-y-auto",
        left: "inset-y-0 left-0 h-full w-full data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-500 overflow-hidden",
        right: "inset-y-0 right-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm overflow-hidden",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom h-[90vh] rounded-t-[2.5rem] p-5 pb-20 overflow-hidden",
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top h-full rounded-b-none px-0 pt-0 pb-16 overflow-hidden",
      },
    },
    defaultVariants: {
      position: "center",
    },
  }
)

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogVariants> {
    showRetractHandle?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, position, showRetractHandle, ...props }, ref) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const finalPosition = isMobile ? "bottom" : position || "center";
  const isLeftPanel = finalPosition === "left";
  const isBottomPanel = finalPosition === "bottom";
  
  const contentOffsetClass = isLeftPanel ? "pl-[5.5rem] lg:pl-[7.5rem]" : "";

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(dialogVariants({ position: finalPosition }), className)}
        {...props}
      >
        {isBottomPanel && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted/40 rounded-full" />
        )}

        <div className={cn("mx-auto w-full h-full flex flex-col relative", (finalPosition === "top" || finalPosition === "left") ? "max-w-[1600px]" : "", contentOffsetClass)}>
            <div className={cn("flex-1 min-h-0", isLeftPanel ? "" : "p-6 pt-4")}>
                {children}
            </div>
            
            <DialogPrimitive.Close className={cn(
                "absolute rounded-full transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none shadow-2xl z-[60]",
                isLeftPanel 
                  ? "left-2 top-1/2 -translate-y-1/2 p-3 bg-primary text-primary-foreground border-4 border-background h-14 w-14 flex items-center justify-center -translate-x-1/2" 
                  : "right-4 top-4 p-1.5 bg-secondary text-muted-foreground opacity-70 hover:opacity-100",
                isBottomPanel && "top-0 right-2 translate-y-2 translate-x-0"
            )}>
                {isLeftPanel ? <ChevronLeft className="h-6 w-6" /> : <X className="h-3.5 w-3.5" />}
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1 text-center sm:text-left mb-4",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-auto pt-4",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-2xl font-black font-headline tracking-tighter leading-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}