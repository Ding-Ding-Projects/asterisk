/** Shared, framework-neutral contracts for bundled documentation surfaces. */

export interface DocumentationHeading {
  readonly title: string;
  readonly id: string;
}

export interface DocumentationArticle {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly headings: readonly DocumentationHeading[];
  readonly links: readonly string[];
  readonly body: string;
}

export interface DocumentationBundle {
  readonly generatedAt: string;
  readonly articleCount: number;
  readonly articles: readonly DocumentationArticle[];
}

export type DocumentationSearchOrigin = 'title' | 'heading' | 'body';

export interface DocumentationSearchHit {
  readonly articleId: string;
  readonly category: string;
  readonly title: string;
  readonly origin: DocumentationSearchOrigin;
  readonly excerpt: string;
  readonly matchStart: number;
  readonly matchEnd: number;
  readonly captures: readonly (string | undefined)[];
}

export type CommitAvailability = 'verified' | 'missing' | 'unverified';

/**
 * A mount descriptor is the narrow seam used by the central renderer integration.
 * It names the navigation destination and exposes a component without taking over
 * application routing or editing the generated design shell.
 */
export interface SurfaceMountDescriptor<Props, Component> {
  readonly id: string;
  readonly navigationId: string;
  readonly label: string;
  readonly Component: Component;
  readonly defaultProps: Props;
}
