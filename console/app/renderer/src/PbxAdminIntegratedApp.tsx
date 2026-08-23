import { PbxAdminApp } from './PbxAdminApp';
import { SCREENS } from './generated/console';
import { featureForAdvancedScreen } from './pbx-admin-screens';

/**
 * Final navigation integration for PBX Admin.
 *
 * A standard-module entry that already has a richer, live Ding destination does not
 * grow a second implementation. It acts as a real navigation alias into that existing
 * destination, so live readings, tables, configuration controls, confirmation flows and
 * empty-state honesty all stay in one place. Modules without a delegate remain on the
 * PBX Admin generic/M3 editor provided by PbxAdminApp.
 */
export class PbxAdminIntegratedApp extends PbxAdminApp {
  componentDidUpdate() {
    super.componentDidUpdate();
    const screen = String((this.state as { screen?: string }).screen ?? '');
    const feature = featureForAdvancedScreen(screen);
    const delegate = feature?.delegateScreen;
    if (!delegate) return;

    const target = (SCREENS as unknown as Record<string, { rail?: string }>)[delegate];
    if (!target?.rail) {
      this.fire('Destination unavailable', `${feature.label} is mapped to ${delegate}, but that Ding destination is not registered.`);
      return;
    }

    this.setState({ screen: delegate, railId: target.rail } as never);
  }
}
