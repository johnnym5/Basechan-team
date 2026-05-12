"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronUp, X, ChevronLeft } from "lucide-react"

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
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const dialogVariants = cva(
  "fixed z-50 gap-4 bg-background/95 shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 backdrop-blur-xl",
  {
    variants: {
      position: {
        center: "left-[50%] top-[50%] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border p-6 duration-200 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        left: "inset-y-0 left-0 h-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-4xl",
        right: "inset-y-0 right-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom h-[90vh] rounded-t-[2.5rem] p-6 pb-20",
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top h-full max-h-[98vh] rounded-b-[4rem] px-0 pt-0 pb-16",
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
  const isTopPanel = finalPosition === "top";
  const isBottomPanel = finalPosition === "bottom";
  const isSidePanel = finalPosition === "left" || finalPosition === "right";

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

        <div className={cn("mx-auto w-full h-full flex flex-col relative", isTopPanel ? "max-w-7xl" : "")}>
            <div className={cn("flex-1 h-full min-h-0", (isTopPanel || isSidePanel) && "px-8 pt-4", isBottomPanel && "pt-6")}>
                {children}
            </div>
            
            <DialogPrimitive.Close className={cn(
                "absolute rounded-full transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground shadow-2xl z-[60]",
                isTopPanel 
                  ? "left-1/2 -bottom-2 -translate-x-1/2 p-4 bg-primary text-primary-foreground border-4 border-background h-16 w-16 flex items-center justify-center translate-y-1/2" 
                  : "right-4 top-4 p-2 bg-secondary text-muted-foreground opacity-70 hover:opacity-100",
                isBottomPanel && "top-0 right-2 translate-y-2 translate-x-0"
            )}>
                {isTopPanel ? <ChevronUp className="h-8 w-8" /> : <X className="h-4 w-4" />}
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left mb-6",
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
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-auto pt-6",
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
      "text-3xl font-bold font-headline tracking-tight",
      className
    )}
    {...props}
  >
    {props.children}
  </DialogPrimitive.Title>
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-lg text-muted-foreground", className)}
    {...props}
  >
    {props.children}
  </DialogPrimitive.Description>
))
DialogDescription.displayName =
  DialogPrimitive.Description.displayName

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
