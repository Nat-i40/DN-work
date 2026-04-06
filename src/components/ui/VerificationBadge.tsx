import * as React from "react"
import { Check } from "lucide-react"

interface VerificationBadgeProps {
  role?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export const VerificationBadge = ({ role, size = "md", className = "" }: VerificationBadgeProps) => {
  if (role === 'employer') {
    const sizeClasses = {
      sm: "p-0.5 ml-1",
      md: "p-0.5 ml-1.5",
      lg: "p-1 ml-2"
    }
    const iconClasses = {
      sm: "w-2.5 h-2.5",
      md: "w-3 h-3",
      lg: "w-4 h-4"
    }
    
    return (
      <div className={`inline-flex items-center justify-center bg-blue-600 rounded-full shadow-sm border border-blue-400/20 align-middle ${sizeClasses[size]} ${className}`} title="Verified Employer">
        <Check className={`${iconClasses[size]} text-white stroke-[3px]`} />
      </div>
    );
  }
  
  if (role === 'admin') {
    const sizeClasses = {
      sm: "p-0.5 ml-1",
      md: "p-0.5 ml-1.5",
      lg: "p-1 ml-2"
    }
    const iconClasses = {
      sm: "w-2.5 h-2.5",
      md: "w-3 h-3",
      lg: "w-4 h-4"
    }
    
    return (
      <div className={`inline-flex items-center justify-center bg-red-600 rounded-full shadow-sm border border-red-400/20 align-middle ${sizeClasses[size]} ${className}`} title="Admin Account">
        <Check className={`${iconClasses[size]} text-white stroke-[3px]`} />
      </div>
    );
  }
  
  return null;
};
