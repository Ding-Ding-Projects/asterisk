import { RAIL, SCREENS, ORDER } from './generated/console';

/**
 * The navigation catalog is derived from the compiled design reference, so a rail,
 * destination, label, badge or source file can only change by changing the design.
 */
export type RailId = 'pbx' | 'media' | 'data' | 'sys' | 'agent' | 'app';
export type DestinationKind = 'dashboard' | 'table' | 'canvas' | 'trunkauth' | 'cli' | 'memory' | 'history' | 'arcade' | 'servers' | 'customise' | 'appearance' | 'settings';

export interface Rail {
  id: RailId;
  icon: string;
  label: string;
  groupLabel: string;
  groupDesc: string;
}

export interface Destination {
  id: string;
  rail: RailId;
  icon: string;
  label: string;
  title: string;
  badge: string;
  /** The configuration file or subsystem the destination owns. */
  source: string;
  kind: DestinationKind;
  description: string;
}

export const rails: Rail[] = RAIL.map((rail: Record<string, string>) => ({
  id: rail.id as RailId,
  icon: rail.icon,
  label: rail.label,
  groupLabel: rail.groupLabel,
  groupDesc: rail.groupDesc,
}));

/** `ORDER` is the design's own command-palette ordering of every destination. */
const screens = SCREENS as unknown as Record<string, Record<string, string>>;

export const destinations: Destination[] = ORDER.map((id: string) => {
  const screen = screens[id];
  return {
    id,
    rail: screen.rail as RailId,
    icon: screen.icon,
    label: screen.label,
    title: screen.title,
    badge: screen.badge ?? '',
    source: screen.file,
    kind: screen.kind as DestinationKind,
    description: screen.sub,
  };
});

export const destinationsByRail = (rail: RailId): Destination[] =>
  destinations.filter((destination) => destination.rail === rail);

export const findDestination = (id: string): Destination | undefined =>
  destinations.find((destination) => destination.id === id);
