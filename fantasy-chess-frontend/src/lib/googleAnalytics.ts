export const GA_MEASUREMENT_ID = 'G-KTZ9L0HQQJ'

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

export function trackPageView(path: string) {
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
    send_to: GA_MEASUREMENT_ID,
  })
}

export function trackSignUp() {
  window.gtag?.('event', 'sign_up', {
    method: 'email',
    send_to: GA_MEASUREMENT_ID,
  })
}
