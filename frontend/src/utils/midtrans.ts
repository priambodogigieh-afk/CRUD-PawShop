declare global {
  interface Window {
    snap?: any
  }
}

export function loadSnapScript(clientKey: string, isProduction: boolean = true): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window is undefined'))
    }

    if (window.snap) {
      return resolve(window.snap)
    }

    const scriptUrl = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js'

    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`) as HTMLScriptElement | null
    if (existingScript) {
      if (window.snap) {
        return resolve(window.snap)
      }
      existingScript.addEventListener('load', () => resolve(window.snap))
      existingScript.addEventListener('error', (err) => reject(err))
      return
    }

    const script = document.createElement('script')
    script.src = scriptUrl
    script.setAttribute('data-client-key', clientKey)
    script.async = true
    script.onload = () => {
      if (window.snap) {
        resolve(window.snap)
      } else {
        // Fallback wait for window.snap to attach
        setTimeout(() => resolve(window.snap), 300)
      }
    }
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap SDK. Pastikan koneksi internet aktif.'))
    document.body.appendChild(script)
  })
}
