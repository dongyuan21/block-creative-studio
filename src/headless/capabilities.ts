import { BCS_CONTRACT_VERSION } from './contracts.js';

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
  ],
} as const;
