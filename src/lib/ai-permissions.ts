/** Runtime host-permission checks for AI targets (hosts are optional, granted on demand). */
import { originsForTarget, type AiTarget } from './ai-targets'

/** True if the AI target's host permission is already granted (no prompt, no user gesture consumed). */
export function hasAiPermission(target: AiTarget): Promise<boolean> {
  return chrome.permissions.contains({ origins: originsForTarget(target) })
}

/** Request the AI target's host permission (prompts unless already granted). Returns the grant result. */
export function requestAiPermission(target: AiTarget): Promise<boolean> {
  return chrome.permissions.request({ origins: originsForTarget(target) })
}
