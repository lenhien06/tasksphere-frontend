import { useState, useCallback } from "react";
import { ProjectService } from "@/app/services/ProjectService";
import { toast } from "sonner";

export const useDeleteProject = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (
      projectId: string,
      confirmName: string,
      onSuccess?: () => void
    ) => {
      // Validation
      if (!confirmName || !confirmName.trim()) {
        const errorMsg = "Confirmation name cannot be empty";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await ProjectService.deleteWithConfirmation(
          projectId,
          confirmName.trim()
        );

        toast.success(response.message || "Project deleted successfully");
        onSuccess?.();
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          "Error deleting project. Please try again.";
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { handleDelete, loading, error };
};
