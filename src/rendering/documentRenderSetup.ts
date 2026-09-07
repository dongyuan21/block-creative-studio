import type { GameRenderContract } from '../game-runtime/renderContract';
import { listRenderBackends, RenderBackendError, type RenderBackendAdapter } from './backendRegistry';
import type { CompositionProfile } from './composition';
import { CompositionRegistryError, listCompositionProfiles } from './compositionRegistry';
import type { RenderResourcePolicy } from './resourcePolicy';

export interface DocumentRenderSetup {
  backend: RenderBackendAdapter;
  composition: CompositionProfile;
  renderContract: GameRenderContract;
  resourcePolicy: RenderResourcePolicy;
}

export function resolveDocumentRenderSetup(input: {
  gameId: string;
  presentationSchemaId: string;
  renderContracts: readonly GameRenderContract[];
  renderer?: string;
  lookPackId?: string;
}): DocumentRenderSetup {
  const renderer = input.renderer ?? 'fixed-camera-cinematic';
  const schemaMatches = listRenderBackends().filter((backend) => (
    backend.supportedPresentationSchemas.includes(input.presentationSchemaId)
    && backend.renderer === renderer
  ));
  const backend = schemaMatches.find((item) => item.id.startsWith(`${input.gameId}.`)) ?? schemaMatches[0];
  if (!backend) {
    throw new RenderBackendError(
      'BACKEND_UNKNOWN',
      `No ${renderer} backend is registered for ${input.gameId} schema ${input.presentationSchemaId}.`,
      '$.backend',
    );
  }

  const composition = listCompositionProfiles().find((item) => item.gameId === input.gameId);
  if (!composition) {
    throw new CompositionRegistryError(
      'UNKNOWN_COMPOSITION',
      `No composition profile is registered for ${input.gameId}.`,
      '$.composition',
    );
  }

  const renderContract = input.renderContracts.find((item) => item.gameId === input.gameId);
  if (!renderContract) {
    throw new RenderBackendError(
      'BACKEND_NOT_IN_CONTRACT',
      `No render contract is registered for ${input.gameId}.`,
      '$.renderContract',
    );
  }
  if (!renderContract.backends[backend.renderer]) {
    throw new RenderBackendError(
      'BACKEND_NOT_IN_CONTRACT',
      `Render contract ${renderContract.id} does not declare backend ${backend.renderer}.`,
      `$.backends.${backend.renderer}`,
    );
  }

  const reason = `Document render uses registered backend ${backend.id} with game-owned procedural resources (no plan-bound material set).`;
  const lookPackId = input.lookPackId?.trim();
  return {
    backend,
    composition,
    renderContract,
    resourcePolicy: lookPackId
      ? {
          mode: 'procedural-no-assets',
          reason,
          runtimeAssets: { lookPackId },
        }
      : {
          mode: 'procedural-no-assets',
          reason,
        },
  };
}
