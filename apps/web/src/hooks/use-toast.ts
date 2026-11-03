import { toast as sonnerToast } from 'sonner'

type ToastVariant = 'default' | 'destructive' | 'success'

type ToastProps = {
  title?: string
  description?: string
  variant?: ToastVariant
}

export function useToast() {
  const toast = ({ title, description, variant = 'default' }: ToastProps) => {
    switch (variant) {
      case 'destructive':
        sonnerToast.error(title, { description })
        break
      case 'success':
        sonnerToast.success(title, { description })
        break
      default:
        sonnerToast(title, { description })
    }
  }

  return { toast }
}
