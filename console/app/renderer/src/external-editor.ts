/**
 * Re-export shim.
 *
 * The catalog and decision logic used to live here directly; it moved to
 * `shared/editor-catalog.ts` so the privileged main process could import the exact same
 * tested `detectEditors`/`chosenEditor`/`planLaunch` functions when it wires up real
 * detection and launch (see `control-plane/editor-launch.ts`) instead of a second,
 * possibly-drifting copy. This file re-exports everything unchanged so existing imports
 * (`App.tsx`, `tests/ui/external-editor.test.tsx`) do not need to know it moved.
 */
export * from '../../../shared/editor-catalog.ts';
