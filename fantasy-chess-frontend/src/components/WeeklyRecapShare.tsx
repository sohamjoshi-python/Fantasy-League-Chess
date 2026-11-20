import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Download, Image as ImageIcon, Share2, X } from 'lucide-react'
import type { League } from '../types'
import {
  buildRecapText,
  drawRecapImage,
  fetchWeeklyRecap,
  recapPostUrl,
  recapRedditUrl,
  type WeeklyRecap,
} from '../lib/weeklyRecap'

type Props = {
  userId: string
  league: Pick<League, 'id' | 'name' | 'start_date' | 'end_date'>
  tuesdayDot: string
  onClose: () => void
}

type Copied = 'text' | 'image' | null

const actionClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-royalBlue hover:text-royalBlue'

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function RedditLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm6.67 13.3c.03.2.05.4.05.6 0 3.06-3.56 5.54-7.95 5.54S2.82 16.96 2.82 13.9c0-.2.02-.41.05-.61a1.75 1.75 0 1 1 1.92-2.86 8.6 8.6 0 0 1 4.7-1.49l.89-4.18a.37.37 0 0 1 .44-.29l2.94.62a1.24 1.24 0 1 1-.13.6l-2.63-.55-.8 3.79a8.57 8.57 0 0 1 4.63 1.49 1.75 1.75 0 1 1 1.84 2.88zM8.52 13.3a1.24 1.24 0 1 0 2.48 0 1.24 1.24 0 0 0-2.48 0zm6.95 3.3a.33.33 0 0 0-.47-.46 4.5 4.5 0 0 1-3 .9 4.5 4.5 0 0 1-3-.9.33.33 0 0 0-.47.46 5.1 5.1 0 0 0 3.47 1.1 5.1 5.1 0 0 0 3.47-1.1zm-.23-2.06a1.24 1.24 0 1 0 0-2.48 1.24 1.24 0 0 0 0 2.48z" />
    </svg>
  )
}

const WeeklyRecapShare: React.FC<Props> = ({ userId, league, tuesdayDot, onClose }) => {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null)
  const [error, setError] = useState('')
  const [includeLeague, setIncludeLeague] = useState(false)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [copied, setCopied] = useState<Copied>(null)

  useEffect(() => {
    let cancelled = false
    setRecap(null)
    setError('')
    fetchWeeklyRecap(userId, league, tuesdayDot)
      .then((data) => {
        if (!cancelled) setRecap(data)
      })
      .catch((loadError) => {
        console.error('Could not load weekly recap:', loadError)
        if (!cancelled) setError('Could not load this week. Try again in a moment.')
      })
    return () => {
      cancelled = true
    }
  }, [userId, league.id, tuesdayDot])

  useEffect(() => {
    if (!recap) return
    let cancelled = false
    let url = ''
    setImageBlob(null)
    drawRecapImage(recap, includeLeague)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setImageBlob(blob)
        setImageUrl(url)
      })
      .catch((drawError) => console.error('Could not draw weekly recap image:', drawError))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [recap, includeLeague])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const text = useMemo(() => (recap ? buildRecapText(recap, includeLeague) : ''), [recap, includeLeague])
  const fileName = `fantasy-league-chess-${tuesdayDot.replace(/\./g, '-')}.png`
  const imageFile = useMemo(
    () => (imageBlob ? new File([imageBlob], fileName, { type: 'image/png' }) : null),
    [imageBlob, fileName]
  )
  const canShareFile = Boolean(
    imageFile && typeof navigator.canShare === 'function' && navigator.canShare({ files: [imageFile] })
  )
  const canCopyImage = typeof window.ClipboardItem !== 'undefined' && Boolean(navigator.clipboard?.write)

  const flash = (kind: Copied) => {
    setCopied(kind)
    window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 2000)
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text)
      flash('text')
    } catch (copyError) {
      console.error('Could not copy recap text:', copyError)
    }
  }

  const copyImage = async () => {
    if (!imageBlob) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })])
      flash('image')
    } catch (copyError) {
      console.error('Could not copy recap image:', copyError)
    }
  }

  const download = () => {
    if (!imageUrl) return
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = fileName
    link.click()
  }

  const shareNative = async () => {
    if (!imageFile) return
    try {
      await navigator.share({ files: [imageFile], text })
    } catch (shareError) {
      if ((shareError as DOMException)?.name !== 'AbortError') {
        console.error('Could not share recap:', shareError)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-recap-title"
        className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-neutral-100">
          <div>
            <h2 id="weekly-recap-title" className="text-lg font-bold text-neutral-900">
              Share your week
            </h2>
            <p className="text-sm text-neutral-500">
              {league.name} · Titled Tuesday {tuesdayDot}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-0 rounded-md p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <>
              <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-neutral-100">
                {imageUrl && imageBlob ? (
                  <img src={imageUrl} alt="Your weekly results card" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full animate-pulse bg-neutral-200" />
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-700 select-none">
                <input
                  type="checkbox"
                  checked={includeLeague}
                  onChange={(event) => setIncludeLeague(event.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-royalBlue focus:ring-royalBlue"
                />
                Show league name
              </label>

              {canShareFile && (
                <button
                  type="button"
                  onClick={() => void shareNative()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e293b] px-4 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-royalBlue"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              )}

              <div className="flex flex-wrap gap-2 [&>*]:flex-1 [&>*]:min-w-[8.5rem] [&>*]:whitespace-nowrap">
                <button type="button" onClick={() => void copyText()} disabled={!recap} className={actionClass}>
                  {copied === 'text' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied === 'text' ? 'Copied' : 'Copy text'}
                </button>
                {canCopyImage && (
                  <button type="button" onClick={() => void copyImage()} disabled={!imageBlob} className={actionClass}>
                    {copied === 'image' ? <Check className="h-4 w-4 text-green-600" /> : <ImageIcon className="h-4 w-4" />}
                    {copied === 'image' ? 'Copied' : 'Copy image'}
                  </button>
                )}
                <button type="button" onClick={download} disabled={!imageBlob} className={actionClass}>
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <a
                  href={recap ? recapPostUrl(recap, includeLeague) : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${actionClass} ${recap ? '' : 'pointer-events-none opacity-50'}`}
                >
                  <XLogo className="h-3.5 w-3.5" />
                  Post on X
                </a>
                <a
                  href={recap ? recapRedditUrl(recap, includeLeague) : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${actionClass} ${recap ? '' : 'pointer-events-none opacity-50'}`}
                >
                  <RedditLogo className="h-4 w-4" />
                  Reddit
                </a>
              </div>
              <p className="text-xs text-neutral-500">
                For Discord, copy the text or the image and paste it into any channel. To include the image on X,
                attach the downloaded card to your post.
              </p>

              <pre className="whitespace-pre-wrap break-words rounded-lg border border-neutral-200 bg-neutral-50 p-4 font-sans text-sm leading-relaxed text-neutral-800">
                {recap ? text : 'Loading your week...'}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default WeeklyRecapShare
