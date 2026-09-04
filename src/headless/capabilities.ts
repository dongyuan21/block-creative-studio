import { BCS_CONTRACT_VERSION } from './contracts.js';
import { getDefaultCompositionProfile } from '../rendering/compositionRegistry.js';

const defaultComposition = getDefaultCompositionProfile();
const designLabel = `${defaultComposition.designResolution.width}×${defaultComposition.designResolution.height}`;
const videoLabel = `${defaultComposition.videoResolution.width}×${defaultComposition.videoResolution.height}`;

export const BCS_CAPABILITIES = {
  product: 'block-creative-studio',
  contractVersion: BCS_CONTRACT_VERSION,
  mode: 'agent-operable',
  embeddedAgent: false,
  renderers: ['reference-2d', 'fixed-camera-cinematic', 'three-3d'],
  lockModes: ['frame-exact', 'semantic', 'rule-only'],
  assetOrigins: ['builtin', 'uploaded', 'generated', 'project', 'external-dcc'],
  pluginRuntimes: ['web-worker', 'node-worker', 'wasm'],
  commands: [
    'capabilities',
    'schema list',
    'schema get',
    'asset validate',
    'variant compile',
    'quality check',
    'material compile',
    'golden batch',
    'project migrate',
  ],
  notes: {
    'fixed-camera-cinematic': 'Available for locked 9:16 preview/export through the existing Three.js scene with Shot Profile, LookDev diagnostics and PBR runtime. Not a new engine.',
    headlessVideo: 'Browser WebCodecs export only. CLI does not emit rendered:true.',
    browserCapture: `npm run capture:review uses headless Chrome to write native 2D frames and ${videoLabel} silent MP4s. Software WebGL is not a GPU performance result.`,
    videoLetterbox: `${designLabel} → ${videoLabel} uses contain/letterbox only. This is a transitional reference-transfer mapping, not a finished 9:16 production profile.`,
    diagnosticViews: 'world-normal, highlight-clip and bloom-contribution are proxy visualizations (flatShading / extra emissive / LDR output), not named G-buffer or HDR bloom buffers.',
  },
} as const;
