/**
 * TodoTwo copy, in English.
 *
 * The farm runs in English: the Todoist export is English throughout, and the
 * people using this are international — the same reason the recurrence rules in
 * that export appear in English and German rather than Norwegian.
 *
 * Strings live here rather than inline so they can be reviewed in one place,
 * and so adding a second language later is a matter of adding a dictionary
 * rather than hunting through components. The storefront stays Norwegian; this
 * is a separate audience.
 */
export const copy = {
  meta: {
    appName: 'TodoTwo',
    farmName: 'Tinglumgård',
    tagline: 'Work, tasks and people at Tinglumgård.',
  },

  common: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading …',
    retry: 'Try again',
    undo: 'Undo',
    wait: 'Wait …',
    none: 'None',
    today: 'Today',
    tomorrow: 'Tomorrow',
    yesterday: 'Yesterday',
    somethingWentWrong: 'Something went wrong',
  },

  nav: {
    overview: 'Overview',
    tasks: 'Tasks',
    week: 'Week',
    people: 'People',
    settings: 'Settings',
    mainMenu: 'Main menu',
    signOut: 'Sign out',
  },

  auth: {
    signInIntro: 'Enter your email address and we will send you a sign-in link.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Send sign-in link',
    sending: 'Sending …',
    noPasswords: 'No passwords. Accounts are created by the farm administrator.',
    checkInbox: 'Check your email',
    checkInboxBody:
      'We have sent a sign-in link to {email}. It is valid for one hour and can only be used once.',
    useAnotherAddress: 'Use a different address',
    signingIn: 'Signing you in …',
    signInFailed: 'Sign-in failed',
    errors: {
      emptyEmail: 'Enter your email address.',
      noCode: 'The sign-in link was incomplete. Request a new one.',
      exchangeFailed: 'That sign-in link has been used or has expired. Request a new one.',
      noPerson: 'This email address does not have access to TodoTwo. Ask Kenneth.',
      noAccess: 'This email address does not have access to TodoTwo.',
      sendFailed: 'Could not send the sign-in link. Try again shortly.',
      unauthenticated: 'You need to be signed in.',
      forbidden: 'You do not have access to this.',
    },
  },

  roles: {
    super_admin: 'Super administrator',
    farm_admin: 'Farm administrator',
    coordinator: 'Coordinator',
    workawayer: 'Workawayer',
    applicant: 'Applicant',
  } as Record<string, string>,

  overview: {
    greeting: 'Hello, {name}',
    accountTitle: 'Your account',
    name: 'Name',
    email: 'Email',
    rolesLabel: 'Roles',
    noRoles: 'No roles assigned',
    farmDate: 'Farm date',
  },

  errors: {
    pageTitle: 'Something went wrong',
    pageBody: 'TodoTwo could not display this page. Try again — if it keeps happening, tell Kenneth.',
    reference: 'Reference: {digest}',
    notFound: 'Not found',
  },
}

/** Fills {placeholders}: format(copy.overview.greeting, { name: 'Kenneth' }) */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  )
}

/** Dates and numbers are formatted for an international audience, not Norwegian. */
export const UI_LOCALE = 'en-GB'
