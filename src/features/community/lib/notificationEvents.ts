/**
 * Fired on `window` whenever the notification socket pushes a new notification, so a page that shows what the notification is
 * about (the examiner's queue, for one) can load it again at once instead of waiting for the person to reload.
 */
export const NOTIFICATION_PUSHED = 'notification-pushed'
