import { createDefaultPlatform } from './bootstrap/platformBootstrap';
import { StudioShell } from './studio/StudioShell';

const platform = createDefaultPlatform();

export default function App() {
  return <StudioShell registry={platform.studio} />;
}
