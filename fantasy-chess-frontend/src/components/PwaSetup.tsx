import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  canUseWebPush,
  currentPushSubscription,
  disableTuesdayReminder,
  enableTuesdayReminder,
  isIos,
  isStandaloneDisplay,
  savePushSubscription,
} from '../lib/webPush'

const INSTALL_DISMISS_KEY = 'flc-pwa-install-dismissed'
const REMINDER_DISMISS_KEY = 'flc-pwa-reminder-dismissed'

export default function PwaSetup() {
  const { user } = useAuth()
  const location = useLocation()
  const [standalone, setStandalone] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(
    () => localStorage.getItem(INSTALL_DISMISS_KEY) === '1',
  )
  const [reminderDismissed, setReminderDismissed] = useState(
    () => localStorage.getItem(REMINDER_DISMISS_KEY) === '1',
  )
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setStandalone(isStandaloneDisplay())

    const onInstalled = () => setStandalone(true)
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  useEffect(() => {
    if (!user || !canUseWebPush()) return
    let cancelled = false
    currentPushSubscription()
      .then(async (subscription) => {
        if (cancelled || !subscription || Notification.permission !== 'granted') return
        await savePushSubscription(user.id, subscription)
        if (!cancelled) setSubscribed(true)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (location.pathname === '/tutorial') return null

  const ios = typeof navigator !== 'undefined' && isIos()
  const showInstall = !standalone && !installDismissed && ios
  const showReminder = Boolean(user) && canUseWebPush() && !reminderDismissed && (!ios || standalone)
  if (!showInstall && !showReminder) return null

  const dismissInstall = () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, '1')
    setInstallDismissed(true)
  }

  const dismissReminder = () => {
    localStorage.setItem(REMINDER_DISMISS_KEY, '1')
    setReminderDismissed(true)
  }

  const enableReminder = async () => {
    if (!user) return
    setBusy(true)
    setMessage('')
    try {
      await enableTuesdayReminder(user.id)
      setSubscribed(true)
      setMessage('Reminders are on. You will get one Monday at 8:00 PM Eastern.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not turn on reminders.')
    } finally {
      setBusy(false)
    }
  }

  const disableReminder = async () => {
    if (!user) return
    setBusy(true)
    try {
      await disableTuesdayReminder(user.id)
      setSubscribed(false)
      setMessage('Tuesday reminders are off.')
    } catch {
      setMessage('Could not turn off reminders.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-lg rounded-xl border-2 border-gold bg-white p-4 shadow-2xl">
        {showInstall && (
          <div className={showReminder ? 'mb-4' : ''}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-neutral-900">Add Fantasy League Chess to your home screen</p>
                <p className="mt-1 text-sm text-neutral-600">
                  It opens full screen, with the app icon, and no browser bar.
                </p>
              </div>
              <button type="button" onClick={dismissInstall} className="min-h-11 min-w-11 text-neutral-500" aria-label="Dismiss">
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-neutral-700">
              On iPhone, tap the Share button, then <span className="font-semibold">Add to Home Screen</span>.
            </p>
          </div>
        )}

        {showReminder && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-neutral-900">Tuesday lineup reminder</p>
                <p className="mt-1 text-sm text-neutral-600">
                  A lock-screen note Monday at 8:00 PM Eastern, before lineups lock for Titled Tuesday.
                </p>
              </div>
              {!showInstall && (
                <button type="button" onClick={dismissReminder} className="min-h-11 min-w-11 text-neutral-500" aria-label="Dismiss reminder">
                  ✕
                </button>
              )}
            </div>
            {subscribed ? (
              <button
                type="button"
                onClick={disableReminder}
                disabled={busy}
                className="mt-3 w-full min-h-12 rounded-lg border-2 border-royalBlue px-4 py-3 font-semibold text-royalBlue disabled:opacity-60"
              >
                Turn off reminders
              </button>
            ) : (
              <button
                type="button"
                onClick={enableReminder}
                disabled={busy}
                className="mt-3 w-full min-h-12 rounded-lg bg-[#1e293b] px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Turning on...' : 'Notify me Monday evening'}
              </button>
            )}
            {message && <p className="mt-2 text-sm text-neutral-700">{message}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
