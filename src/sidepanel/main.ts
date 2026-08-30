// AI frame host: loads the AI URL (passed as ?u=) into a full-height iframe.
// Used by BOTH the side panel and the in-page iframe mode (PreviewFrame nests
// this page so the AI frame is extension-initiated). Framing works because the
// background strips X-Frame-Options / CSP on AI sub-frames initiated by this
// extension origin (see service-worker.ts). ponytail: logged-out, 3rd-party context.
//
// This page is web-accessible, so any site can embed it with its own ?u=.
// safeAiFrameUrl only allows https URLs for known AI hosts, so it can't be
// abused as a framing proxy for arbitrary URLs.
import { safeAiFrameUrl } from '../lib/ai-targets'

const url = safeAiFrameUrl(new URLSearchParams(location.search).get('u'))
const frame = document.getElementById('frame') as HTMLIFrameElement | null
if (frame && url) frame.src = url
