import toast from "react-hot-toast";
import { AxiosError } from "axios";

export interface BabblrErrorResponse {
  // Old backend error format (structured object)
  error?: {
    code: string;
    message: string;
    details?: any;
    retry?: boolean;
    action?: string;
  };
  // New backend error format (simple fields)
  message?: string;
  technical_details?: string;
  fix?: string;
}

export interface ErrorDetails {
  message: string;
  code: string;
  retry: boolean;
  action?: string;
  technical_details?: string;
  status?: number;
}

export const handleError = (error: unknown): ErrorDetails => {
  // Log full error details to console for developers
  console.group("🔴 Error Details");
  console.error("Full error object:", error);

  let message = "An unexpected error occurred. Please try again.";
  let code = "UNKNOWN_ERROR";
  let retry = false;
  let action: string | undefined;
  let technical_details: string | undefined;
  let status: number | undefined;

  if (error instanceof Error) {
    message = error.message;
    technical_details = error.stack;
  }

  // Handle Axios errors
  if (isAxiosError(error)) {
    status = error.response?.status;
    const data = error.response?.data;

    console.log("HTTP Status:", status);
    console.log("Response data:", data);

    // New backend error format (structured)
    if (data && typeof data === 'object') {
      if ('message' in data && typeof data.message === 'string') {
        // New format: { message: "...", technical_details: "..." }
        message = data.message || message;
        technical_details = (data as any).technical_details;
        action = (data as any).fix;
      } else if ('error' in data && typeof data.error === 'object' && data.error !== null && 'message' in data.error) {
        // Old format: { error: { code: "...", message: "..." } }
        const errorObj = data.error as any;
        message = errorObj.message;
        code = errorObj.code;
        retry = errorObj.retry || false;
        action = errorObj.action;
        technical_details = errorObj.details;
      }
    }

    // Override with specific error messages based on status
    if (error.code === "ECONNABORTED") {
      message = "Request timed out. Please try again.";
      code = "TIMEOUT";
      retry = true;
    } else if (!error.response) {
      message = "Network error. Cannot reach the server.";
      code = "NETWORK_ERROR";
      retry = true;
      technical_details = "Server might be down or network connection lost";
    } else if (status === 401) {
      code = "AUTHENTICATION_ERROR";
      retry = false;
    } else if (status === 503) {
      code = "SERVICE_UNAVAILABLE";
      retry = true;
    }
  }

  console.log("Processed error:", { message, code, technical_details, status });
  console.groupEnd();

  // Create a detailed error message with technical details expandable
  const toastMessage = technical_details
    ? `${message}\n\n💡 Technical: ${technical_details.substring(0, 100)}${technical_details.length > 100 ? '...' : ''}`
    : message;

  // Display toast with error
  toast.error(toastMessage, {
    duration: status === 401 ? 10000 : 5000, // Show auth errors longer
    id: code, // Prevent duplicate toasts
    style: {
      maxWidth: '600px',
    },
  });

  return { message, code, retry, action, technical_details, status };
};

function isAxiosError(error: any): error is AxiosError {
  return error.isAxiosError === true;
}
