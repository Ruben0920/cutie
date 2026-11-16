import { AxiosError } from 'axios';

interface FastApiErrorBody {
  detail?: string | Array<{ msg?: string }>;
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as FastApiErrorBody | undefined;
    if (typeof data?.detail === 'string' && data.detail.trim().length > 0) {
      return data.detail;
    }
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      const firstMsg = data.detail[0]?.msg;
      if (firstMsg) return firstMsg;
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
