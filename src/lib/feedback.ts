/** Feedback links and the rotating nudge messages shown in the popup + options. */

export const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/selection-to-popup/ehiiodgjjgibclbmfbiflepipnlmbkkc/support'
export const GITHUB_ISSUES_URL =
  'https://github.com/Arif-un/Chrome-Extention--Selection-to-Pop-up/issues'
/** Prefilled "new issue" form for feature requests (labels + a request template). */
export const GITHUB_FEATURE_URL =
  'https://github.com/Arif-un/Chrome-Extention--Selection-to-Pop-up/issues/new?labels=enhancement&title=%5BFeature%5D+&body=' +
  encodeURIComponent(
    'What would you like to be able to do?\n\n\nWhy is it useful / what problem does it solve?\n\n\nHow do you imagine it working?\n',
  )

/** Friendly one-liners, shown one at random each time the popup/options opens. */
export const FEEDBACK_MESSAGES = [
  'Found a bug or missing a feature? Tell us — every report shapes the next release.',
  'Got an idea or recommendation? We read every one.',
  'If you want to see this extension keep improving, please rate us. It costs 0 but means a lot.',
  'Enjoying it? A quick rating helps more than you think — and it is free.',
  'Something feels off? Open an issue and we will look into it.',
]

/** Pick a random message. Kept trivial; identity varies per call site render. */
export const randomFeedbackMessage = () =>
  FEEDBACK_MESSAGES[Math.floor(Math.random() * FEEDBACK_MESSAGES.length)]
