import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position='top-right'
      toastOptions={{
        style: {
          background: '#0F172A',
          color: '#F8FAFC',
          border: '1px solid #334155',
          borderRadius: '8px',
        },
        className: 'font-sans',
      }}
    />
  )
}
