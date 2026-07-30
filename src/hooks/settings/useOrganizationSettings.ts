import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { OrganizationSettings } from "@/lib/settings-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useOrganizationSettings(orgId: string | undefined) {
  const firestore = useFirestore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() =>
    firestore && orgId ? doc(firestore, "organization_settings", orgId) : null
  , [firestore, orgId]);

  const { data, isLoading, error: fetchError } = useDoc<OrganizationSettings>(settingsRef);

  const error = fetchError || (data === undefined && !isLoading ? new Error("Organization configuration not found.") : null);

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<OrganizationSettings>) => {
      if (!settingsRef) throw new Error("No organization selected");
      await setDoc(settingsRef, {
        ...newSettings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    },
    onSuccess: () => {
      toast({
        title: "Settings Synchronized",
        description: "Organization configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["doc", settingsRef?.path] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.message || "An unexpected error occurred during synchronization.",
      });
    }
  });

  return {
    settings: data,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending
  };
}
