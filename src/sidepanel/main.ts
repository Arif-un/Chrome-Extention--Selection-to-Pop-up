// Side panel host: loads the AI URL (passed as ?u=) into a full-height iframe.
// Framing works because the background strips X-Frame-Options / CSP on AI
// sub-frames (see service-worker.ts). ponytail: logged-out, 3rd-party context.
const url = new URLSearchParams(location.search).get('u')
const frame = document.getElementById('frame') as HTMLIFrameElement | null
if (frame && url) frame.src = url
