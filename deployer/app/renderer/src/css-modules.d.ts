/**
 * Declares the side-effect stylesheet import in `main.tsx`.
 *
 * The bundler resolves `import "./styles.css"` perfectly well; the compiler does not
 * know what a stylesheet is and refuses the import outright. Vite ships this
 * declaration in `vite/client`, but this package resolves its types from the console's
 * installed set, where that entry is not reachable — so it is declared here rather
 * than by adding a type root whose only purpose is one line.
 */
declare module '*.css';
