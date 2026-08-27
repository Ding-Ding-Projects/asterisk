/**
 * Publishing a repository to a forge, without assuming whose namespace it lands in.
 *
 * Three decisions this module exists to make properly, each because the obvious shortcut
 * is wrong in a way nobody notices until it matters:
 *
 *  - WHOSE ACCOUNT, AND WHOSE NAMESPACE. Several accounts may be signed in at once, and
 *    an account may write to organizations as well as its own namespace. Assuming the
 *    signed-in user's own namespace publishes somebody's work to the wrong place, and it
 *    is discovered by a colleague not finding it.
 *  - FORK OR COPY-AND-PUSH. Forking is provider-specific and some providers and
 *    self-hosted instances cannot do it at all. An app that only forks is an app that
 *    cannot publish there -- so where forking is unavailable the fork route is not offered
 *    rather than offered and guaranteed to fail.
 *  - WHICH ROUTE WAS ACTUALLY TAKEN. Reported, never silently substituted. Somebody who
 *    asked for a fork and got a copy has a repository with no upstream link and no idea
 *    why.
 *
 * NO TOKEN PASSES THROUGH HERE. An account carries the vault key that names where its
 * token lives, never the token, so nothing in this module can leak one into a control
 * value, an export or a log -- the same asymmetry the IAX secret and the School mode
 * credential use.
 */

export type ForgeCapability = 'fork' | 'create-repository' | 'push';

export interface ForgeAccount {
  id: string;
  /** Shown in the picker. Not unique on its own -- two forges can host the same login. */
  login: string;
  /** Which forge this account is on, so two accounts with one login stay distinguishable. */
  host: string;
  /**
   * Names the entry in the OS credential vault. Never the token itself: a token on this
   * object would reach every export and screenshot that walks an account list.
   */
  credentialKey: string;
  /** What this forge can actually do. A capability absent here is never offered. */
  capabilities: readonly ForgeCapability[];
}

export interface ForgeOwner {
  /** The account this namespace belongs to or is reachable through. */
  accountId: string;
  /** The namespace itself: the account's own login, or an organization's. */
  name: string;
  kind: 'user' | 'organization';
  /** False when the account can see the organization but not create in it. */
  canCreate: boolean;
}

export const ACTIVE_ACCOUNT_SETTING = 'console.forge.activeAccount';

export interface AccountStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * The active account, which keeps single-account callers working unchanged.
 *
 * Falls back to the only signed-in account when nothing is set, and to undefined when
 * several are -- guessing between two accounts is how work lands in the wrong namespace.
 */
export function activeAccount(
  storage: AccountStorage | undefined,
  accounts: readonly ForgeAccount[],
): ForgeAccount | undefined {
  const stored = storage?.getItem(ACTIVE_ACCOUNT_SETTING);
  const chosen = accounts.find((account) => account.id === stored);
  if (chosen) return chosen;
  return accounts.length === 1 ? accounts[0] : undefined;
}

export function setActiveAccount(storage: AccountStorage, accountId: string): void {
  storage.setItem(ACTIVE_ACCOUNT_SETTING, accountId);
}

/** Signs one account out. The token is removed from the vault by the caller, not here. */
export function signOut(
  storage: AccountStorage,
  accounts: readonly ForgeAccount[],
  accountId: string,
): ForgeAccount[] {
  const remaining = accounts.filter((account) => account.id !== accountId);
  if (storage.getItem(ACTIVE_ACCOUNT_SETTING) === accountId) {
    storage.removeItem(ACTIVE_ACCOUNT_SETTING);
  }
  return remaining;
}

/** Namespaces this account can actually create in, which is not every namespace it sees. */
export function ownersFor(owners: readonly ForgeOwner[], accountId: string): ForgeOwner[] {
  return owners.filter((owner) => owner.accountId === accountId && owner.canCreate);
}

export type PublishRoute = 'fork' | 'copy-and-push';

export interface RouteChoice {
  route: PublishRoute;
  /** Why this route, in words the person can read before agreeing to it. */
  reason: string;
}

export interface RouteRefusal {
  /* Explicitly absent rather than merely unlisted. Without it RouteChoice is structurally
   * assignable to RouteRefusal -- an object with an extra property still satisfies the
   * smaller shape -- so the union does not discriminate and narrowing collapses to never.
   * The tests passed regardless, which is exactly why the compiler is the thing that
   * caught it. */
  route?: undefined;
  reason: string;
}

/**
 * Which route is available, given what the forge can do and what was asked for.
 *
 * A preference for forking on a forge that cannot fork does NOT silently become a copy:
 * the two produce different things -- a fork has an upstream link and a copy does not --
 * and somebody who asked for one and got the other has a repository they cannot explain.
 * So the preference is honoured where possible and the substitution is reported where not.
 */
export function chooseRoute(
  account: ForgeAccount,
  preferred: PublishRoute,
): RouteChoice | RouteRefusal {
  const canFork = account.capabilities.includes('fork');
  const canPush = account.capabilities.includes('push')
    && account.capabilities.includes('create-repository');

  if (preferred === 'fork') {
    if (canFork) {
      return { route: 'fork', reason: `${account.host} can fork, so the copy keeps its link to the original.` };
    }
    if (canPush) {
      return {
        route: 'copy-and-push',
        /* Named as a substitution rather than presented as what was asked for. */
        reason: `${account.host} cannot fork, so this will be a copy with no link back to the original. `
          + 'The history is the same; the relationship is not.',
      };
    }
    return { reason: `${account.host} can neither fork nor create a repository with this account.` };
  }

  if (canPush) {
    return { route: 'copy-and-push', reason: 'A new repository with the same history and no upstream link.' };
  }
  return { reason: `This account cannot create a repository on ${account.host}.` };
}

export function isRefusal(result: RouteChoice | RouteRefusal): result is RouteRefusal {
  return !('route' in result);
}

export interface PublishPlan {
  account: ForgeAccount;
  owner: ForgeOwner;
  route: PublishRoute;
  repositoryName: string;
  /** Everything the person should read before agreeing. Never empty. */
  summary: string;
}

export interface PlanProblem {
  field: 'account' | 'owner' | 'name' | 'route';
  message: string;
}

/** Forge repository names: letters, digits, dot, hyphen, underscore. */
const NAME_PATTERN = /^[A-Za-z0-9._-]+$/u;
export const MAX_REPOSITORY_NAME_LENGTH = 100;

/**
 * Builds the plan, or every reason it cannot be built.
 *
 * All problems at once rather than the first, so somebody fixing a form is not sent round
 * the loop once per mistake.
 */
export function planPublish(input: {
  account?: ForgeAccount;
  owner?: ForgeOwner;
  repositoryName: string;
  preferredRoute: PublishRoute;
}): PublishPlan | { problems: PlanProblem[] } {
  const problems: PlanProblem[] = [];
  const name = input.repositoryName.trim();

  if (!input.account) problems.push({ field: 'account', message: 'Choose which signed-in account to publish with.' });
  if (!input.owner) {
    problems.push({ field: 'owner', message: 'Choose whose namespace this lands in -- your own, or an organization.' });
  } else if (input.account && input.owner.accountId !== input.account.id) {
    /* A namespace belonging to a different account is not reachable with this one, and
     * publishing would fail late with a permission error that says nothing useful. */
    problems.push({ field: 'owner', message: `${input.owner.name} is not reachable with this account.` });
  } else if (!input.owner.canCreate) {
    problems.push({ field: 'owner', message: `This account cannot create repositories in ${input.owner.name}.` });
  }

  if (name === '') {
    problems.push({ field: 'name', message: 'The repository needs a name.' });
  } else if (!NAME_PATTERN.test(name)) {
    problems.push({ field: 'name', message: `"${name}" is not a usable repository name. Letters, digits, dots, hyphens and underscores.` });
  } else if (name.length > MAX_REPOSITORY_NAME_LENGTH) {
    problems.push({ field: 'name', message: `A repository name has to be ${MAX_REPOSITORY_NAME_LENGTH} characters or fewer.` });
  }

  let route: PublishRoute | undefined;
  let routeReason = '';
  if (input.account) {
    const chosen = chooseRoute(input.account, input.preferredRoute);
    if (isRefusal(chosen)) problems.push({ field: 'route', message: chosen.reason });
    else {
      route = chosen.route;
      routeReason = chosen.reason;
    }
  }

  if (problems.length > 0 || !input.account || !input.owner || route === undefined) {
    return { problems };
  }
  return {
    account: input.account,
    owner: input.owner,
    route,
    repositoryName: name,
    summary: `${route === 'fork' ? 'Fork' : 'Copy'} to ${input.owner.name}/${name} on ${input.account.host} `
      + `as ${input.account.login}. ${routeReason}`,
  };
}
