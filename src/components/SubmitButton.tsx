"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

const SubmitButton = ({ disabled }: { disabled?: boolean }) => {
  const { pending } = useFormStatus();

  return (
    <Button
      className="relative w-full font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={disabled || pending}
    >
      <span className={pending ? "text-transparent" : ""}>Pateikti</span>
      {pending && (
        <span className="absolute flex items-center justify-center w-full h-full text-gray-400">
          <LoaderCircle className="animate-spin" />
        </span>
      )}
    </Button>
  );
};

export default SubmitButton;