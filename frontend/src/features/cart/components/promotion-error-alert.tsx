import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PromotionErrorAlertProps {
  message: string;
}

export function PromotionErrorAlert({ message }: PromotionErrorAlertProps) {
  return (
    <Alert id="promo-error" variant="destructive">
      <CircleAlert className="size-4" aria-hidden="true" />
      <AlertTitle>Code non appliqué</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
