import { StudioShell } from './studio/StudioShell';
import { createDefaultStudioRegistry } from './studio/gameStudioRegistry';

const studioRegistry = createDefaultStudioRegistry();

export default function App() {
  return <StudioShell registry={studioRegistry} />;
}
