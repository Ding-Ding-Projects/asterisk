import { useId, type ChangeEvent } from 'react';
import {
  LOGO_PICKER_REGISTRATION,
  LOGO_PRESETS,
  type LogoBackground,
  type LogoCropModel,
} from '../../../shared/logo';
import { type CustomLogoState, type LogoUiState } from './logo-state';
import './logo-surface.css';

export interface LogoSurfaceProps {
  readonly state: LogoUiState;
  readonly onStateChange: (patch: Partial<LogoUiState>) => void;
  readonly onChooseFile: (file: File) => void;
  readonly onReset: () => void;
  readonly disabled?: boolean;
}

function statusCopy(state: CustomLogoState): string {
  switch (state) {
    case 'reading': return 'Reading the local image...';
    case 'ready': return 'Custom logo ready for bounded local conversion.';
    case 'invalid': return 'This image was rejected. The previous logo remains active.';
    case 'conversion-failed': return 'Conversion failed. The previous logo remains active.';
    default: return 'No custom logo selected. The shipped mark is active.';
  }
}

function hexChannel(value: string, offset: number): number {
  return Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
}

function linear(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(hex: string, other: [number, number, number]): number {
  const rgb: [number, number, number] = [hexChannel(hex, 1), hexChannel(hex, 3), hexChannel(hex, 5)];
  const luminance = (channels: [number, number, number]) => 0.2126 * linear(channels[0]) + 0.7152 * linear(channels[1]) + 0.0722 * linear(channels[2]);
  const a = luminance(rgb);
  const b = luminance(other);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function hasContrastWarning(background: LogoBackground): boolean {
  if (background.kind !== 'solid' || !/^#[0-9a-f]{6}$/iu.test(background.color)) return false;
  return Math.min(contrastRatio(background.color, [1, 1, 1]), contrastRatio(background.color, [0, 0, 0])) < 4.5;
}

function NumberField(props: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
  readonly describedBy?: string;
}) {
  const id = useId();
  return (
    <label className="logo-number-field" htmlFor={id}>
      <span>{props.label}</span>
      <input
        id={id}
        type="number"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        aria-describedby={props.describedBy}
        onChange={(event) => props.onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

function updateCrop(crop: LogoCropModel, patch: Partial<LogoCropModel>): LogoCropModel {
  return { ...crop, ...patch };
}

export function LogoSurface(props: LogoSurfaceProps) {
  const statusId = useId();
  const contrastId = useId();
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) props.onChooseFile(file);
    event.currentTarget.value = '';
  };
  const crop = props.state.crop;
  const setCrop = (next: LogoCropModel) => props.onStateChange({ crop: next });
  const contrastWarning = hasContrastWarning(crop.background);

  return (
    <section className="logo-surface" aria-labelledby="logo-surface-title">
      <div className="logo-surface-heading">
        <div>
          <p className="logo-eyebrow">Appearance</p>
          <h2 id="logo-surface-title">App logo</h2>
          <p className="logo-lede">Choose a shipped mark or convert one local image. The package identity never changes.</p>
        </div>
        <button type="button" className="logo-reset-button" onClick={props.onReset} disabled={props.disabled}>Reset to shipped mark</button>
      </div>

      <div className="logo-preset-grid" role="list" aria-label="Shipped logo presets">
        {LOGO_PRESETS.map((preset) => (
          <div role="listitem" key={preset.id}>
            <button
              type="button"
              className={`logo-preset ${props.state.selectedPresetId === preset.id ? 'is-selected' : ''}`}
              aria-pressed={props.state.selectedPresetId === preset.id}
              onClick={() => props.onStateChange({ selectedPresetId: preset.id, customLogoState: 'empty', customLogoLabel: '' })}
              disabled={props.disabled}
            >
              <span className={`logo-preview logo-preview-${preset.previewToken}`} aria-hidden="true"><span /></span>
              <span className="logo-preset-copy"><strong>{preset.label}</strong><small>{preset.description}</small></span>
            </button>
          </div>
        ))}
      </div>

      <div className="logo-upload-card">
        <div>
          <h3>Custom local image</h3>
          <p id={statusId} className="logo-status" role="status" aria-live="polite">{props.state.customLogoLabel || statusCopy(props.state.customLogoState)}</p>
        </div>
        <label className="logo-file-picker">
          <span>Choose local image</span>
          <input type="file" accept={LOGO_PICKER_REGISTRATION.accept} aria-label={LOGO_PICKER_REGISTRATION.accessibleName} aria-describedby={statusId} onChange={onFile} disabled={props.disabled} />
        </label>
      </div>

      <fieldset className="logo-editor" disabled={props.disabled}>
        <legend>Crop and presentation</legend>
        <div className="logo-editor-row">
          <label className="logo-select-field">
            <span>Fit</span>
            <select value={crop.fit} onChange={(event) => setCrop(updateCrop(crop, { fit: event.currentTarget.value as LogoCropModel['fit'] }))}>
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Fill</option>
            </select>
          </label>
          <label className="logo-select-field">
            <span>Background</span>
            <select value={crop.background.kind} onChange={(event) => {
              const kind = event.currentTarget.value as LogoBackground['kind'];
              setCrop(updateCrop(crop, { background: kind === 'transparent' ? { kind: 'transparent' } : { kind: 'solid', color: '#ffffff' } }));
            }}>
              <option value="transparent">Transparent</option>
              <option value="solid">Solid</option>
            </select>
          </label>
          {crop.background.kind === 'solid' && (
            <label className="logo-color-field"><span>Background colour</span><input type="color" value={crop.background.color.slice(0, 7)} onChange={(event) => setCrop(updateCrop(crop, { background: { kind: 'solid', color: event.currentTarget.value } }))} /></label>
          )}
        </div>

        <div className="logo-number-grid" aria-label="Numeric crop rectangle">
          <NumberField label="Crop X" value={crop.crop.x} min={0} max={1} step={0.01} onChange={(value) => setCrop(updateCrop(crop, { crop: { ...crop.crop, x: value } }))} />
          <NumberField label="Crop Y" value={crop.crop.y} min={0} max={1} step={0.01} onChange={(value) => setCrop(updateCrop(crop, { crop: { ...crop.crop, y: value } }))} />
          <NumberField label="Crop width" value={crop.crop.width} min={0.0001} max={1} step={0.01} onChange={(value) => setCrop(updateCrop(crop, { crop: { ...crop.crop, width: value } }))} />
          <NumberField label="Crop height" value={crop.crop.height} min={0.0001} max={1} step={0.01} onChange={(value) => setCrop(updateCrop(crop, { crop: { ...crop.crop, height: value } }))} />
        </div>

        <div className="logo-number-grid" aria-label="Numeric focal point">
          <NumberField label="Focal X" value={crop.focalPoint.x} min={0} max={1} step={0.01} onChange={(value) => setCrop(updateCrop(crop, { focalPoint: { ...crop.focalPoint, x: value } }))} />
          <NumberField label="Focal Y" value={crop.focalPoint.y} min={0} max={1} step={0.01} onChange={(value) => setCrop(updateCrop(crop, { focalPoint: { ...crop.focalPoint, y: value } }))} />
        </div>
        <p className="logo-help">All crop and focal values are proportions from 0 to 1. The same model is keyboard-editable and used by the local converter.</p>
        {contrastWarning && <p id={contrastId} className="logo-warning" role="alert">⚠ Check the live preview: this background may not provide enough contrast for the mark.</p>}
      </fieldset>
    </section>
  );
}
