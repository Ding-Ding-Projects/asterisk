/**
 * The bundled dish catalogue.
 *
 * Empty today, and that is stated rather than hidden. `dim-sum-surprise.ts` already
 * treats an empty catalogue correctly -- `surpriseFor` returns undefined on every draw
 * rather than trying to show a picture that is not there -- so this file being empty
 * does not leave anything broken. It leaves the surprise wired all the way to the
 * running application and permanently declining to fire, which is the honest state
 * for a feature with no bundled dish photography yet.
 *
 * The public dim-sum-photos catalogue is the sole sanctioned source for real dish
 * photography, and pulling images from it is its own separate piece of work: fetching
 * one here, generating a placeholder, or inventing an image path that does not resolve
 * to a real bundled file would all violate the "bundled local asset, never fabricated"
 * half of the contract this feature already promises. See dim-sum-surprise.ts and
 * docs/platform/dim-sum-surprise.md.
 *
 * Once real bundled images exist under assets/dim-sum/, list them here -- each with its
 * own id, both names, and its bundled asset path -- and the surprise starts firing on
 * its own the next time the draw is won. Nothing else in the wiring needs to change.
 */

import type { Dish } from './dim-sum-surprise';

export const DISH_CATALOG: readonly Dish[] = [];
