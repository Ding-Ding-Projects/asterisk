import { LOGO_PRESETS } from './logo-customization';

export interface LogoMarkProps {
  readonly source: string;
  readonly label: string;
}

/**
 * The title-bar mark is a real local consumer of the logo choice. Preset paths are
 * package-local assets and custom sources are short-lived object URLs created only
 * after the renderer has validated the selected bytes. No source filename or path is
 * exposed through the accessible name.
 */
export function LogoMark(props: LogoMarkProps) {
  return (
    <img
      className="app-logo-mark"
      data-app-logo="true"
      src={props.source}
      alt={props.label}
      width={20}
      height={20}
      draggable={false}
    />
  );
}

export function presetLogoSource(presetId: string | undefined): { source: string; label: string } {
  const preset = LOGO_PRESETS.find((candidate) => candidate.id === presetId) ?? LOGO_PRESETS[0];
  return {
    source: `/${preset.asset}`,
    label: `${preset.label} app logo`,
  };
}
