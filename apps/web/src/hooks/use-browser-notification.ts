import { useEffect, useRef } from 'react'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string // Prevents duplicate notifications
  onClick?: () => void
}

/**
 * Hook for managing browser notifications
 * - Checks permission status
 * - Requests permission if needed
 * - Shows notifications with click handler
 */
export function useBrowserNotification() {
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  // Sync permission state
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      permissionRef.current = Notification.permission
    }
  }, [])

  /**
   * Request notification permission
   * Returns true if granted, false otherwise
   */
  const requestPermission = async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') {
      console.warn('Browser notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    const permission = await Notification.requestPermission()
    permissionRef.current = permission

    // Store preference
    localStorage.setItem('notification_permission_requested', 'true')

    return permission === 'granted'
  }

  /**
   * Show browser notification
   * Automatically requests permission if not yet asked
   */
  const showNotification = async (options: NotificationOptions) => {
    if (typeof Notification === 'undefined') {
      return
    }

    // Request permission if default
    if (Notification.permission === 'default') {
      const hasRequested = localStorage.getItem('notification_permission_requested')
      if (!hasRequested) {
        const granted = await requestPermission()
        if (!granted) return
      } else {
        return // Already asked, user didn't grant
      }
    }

    if (Notification.permission !== 'granted') {
      return
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/logo.png',
      tag: options.tag,
      requireInteraction: false,
    })

    if (options.onClick) {
      notification.onclick = () => {
        window.focus()
        options.onClick?.()
        notification.close()
      }
    }

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000)
  }

  return {
    permission: permissionRef.current,
    requestPermission,
    showNotification,
    isSupported: typeof Notification !== 'undefined',
  }
}
