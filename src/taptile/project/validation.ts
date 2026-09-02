import {
  TAPTILE_PROJECT_FORMAT,
  TAPTILE_RULE_PROFILE_ID,
  TAPTILE_SCHEMA_VERSION,
  type TapTileProjectV2,
} from './types';

export class TapTileProjectValidationError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = 'TapTileProjectValidationError';
  }
}

function fail(path: string, message: string): never {
  throw new TapTileProjectValidationError(path, message);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, '必须是对象。');
  return value as Record<string, unknown>;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(path, '必须是非空字符串。');
  return value;
}

function integer(value: unknown, path: string, minimum = Number.MIN_SAFE_INTEGER): number {
  if (!Number.isInteger(value) || (value as number) < minimum) fail(path, `必须是大于等于 ${minimum} 的整数。`);
  return value as number;
}

function finite(value: unknown, path: string, minimum = Number.NEGATIVE_INFINITY): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) fail(path, `必须是大于等于 ${minimum} 的有限数值。`);
  return value;
}

export function isTapTileProjectV2(value: unknown): value is TapTileProjectV2 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TapTileProjectV2>;
  return candidate.format === TAPTILE_PROJECT_FORMAT && candidate.schemaVersion === TAPTILE_SCHEMA_VERSION;
}

export function parseTapTileProjectV2(value: unknown): TapTileProjectV2 {
  const root = record(value, 'root');
  if (root.format !== TAPTILE_PROJECT_FORMAT) fail('root.format', `必须是 ${TAPTILE_PROJECT_FORMAT}。`);
  if (root.schemaVersion !== TAPTILE_SCHEMA_VERSION) fail('root.schemaVersion', `仅支持 ${TAPTILE_SCHEMA_VERSION}。`);
  if (root.ruleProfileId !== TAPTILE_RULE_PROFILE_ID) fail('root.ruleProfileId', `仅支持 ${TAPTILE_RULE_PROFILE_ID}。`);
  string(root.id, 'root.id');
  string(root.name, 'root.name');
  integer(root.revision, 'root.revision', 0);
  if (Number.isNaN(Date.parse(string(root.createdAt, 'root.createdAt')))) fail('root.createdAt', '必须是合法 ISO 时间。');
  if (Number.isNaN(Date.parse(string(root.updatedAt, 'root.updatedAt')))) fail('root.updatedAt', '必须是合法 ISO 时间。');

  const stage = record(root.stage, 'root.stage');
  if (stage.authoringWidth !== 432 || stage.authoringHeight !== 768 || stage.exportWidth !== 1080 || stage.exportHeight !== 1920 || stage.scale !== 2.5 || stage.fps !== 30) {
    fail('root.stage', '一期舞台必须是 432×768 → 1080×1920、2.5 倍、30fps。');
  }
  record(stage.safeAreas, 'root.stage.safeAreas');
  record(root.assets, 'root.assets');
  const visuals = record(root.visuals, 'root.visuals');
  const archetypes = record(visuals.archetypes, 'root.visuals.archetypes');
  record(visuals.faceAssemblies, 'root.visuals.faceAssemblies');
  record(visuals.bodyStyles, 'root.visuals.bodyStyles');
  const themes = record(visuals.themes, 'root.visuals.themes');
  const selectedThemeId = string(visuals.selectedThemeId, 'root.visuals.selectedThemeId');
  if (!themes[selectedThemeId]) fail('root.visuals.selectedThemeId', `找不到主题 ${selectedThemeId}。`);

  const level = record(root.level, 'root.level');
  string(level.id, 'root.level.id');
  string(level.name, 'root.level.name');
  if (!Array.isArray(level.tileInstances)) fail('root.level.tileInstances', '必须是数组。');
  const ids = new Set<string>();
  level.tileInstances.forEach((raw, index) => {
    const path = `root.level.tileInstances[${index}]`;
    const tile = record(raw, path);
    const id = string(tile.id, `${path}.id`);
    if (ids.has(id)) fail(`${path}.id`, `重复 tile id：${id}。`);
    ids.add(id);
    const archetypeId = string(tile.archetypeId, `${path}.archetypeId`);
    if (!archetypes[archetypeId]) fail(`${path}.archetypeId`, `找不到 archetype ${archetypeId}。`);
    const geometry = record(tile.geometry, `${path}.geometry`);
    integer(geometry.centerXPx, `${path}.geometry.centerXPx`);
    integer(geometry.centerYPx, `${path}.geometry.centerYPx`);
    integer(geometry.widthPx, `${path}.geometry.widthPx`, 1);
    integer(geometry.heightPx, `${path}.geometry.heightPx`, 1);
    finite(geometry.rotationDeg, `${path}.geometry.rotationDeg`);
    integer(geometry.layer, `${path}.geometry.layer`, 0);
    integer(geometry.order, `${path}.geometry.order`);
    const authoring = record(tile.authoring, `${path}.authoring`);
    if (typeof authoring.editorLocked !== 'boolean') fail(`${path}.authoring.editorLocked`, '必须是布尔值。');
  });
  const policy = record(level.blockerPolicy, 'root.level.blockerPolicy');
  finite(policy.minimumOverlapAreaPx, 'root.level.blockerPolicy.minimumOverlapAreaPx', 0);
  finite(policy.minimumOverlapRatio, 'root.level.blockerPolicy.minimumOverlapRatio', 0);
  finite(policy.epsilonPx, 'root.level.blockerPolicy.epsilonPx', 0);
  const overrides = record(level.blockerOverrides, 'root.level.blockerOverrides');
  if (!Array.isArray(overrides.forced) || !Array.isArray(overrides.ignored)) fail('root.level.blockerOverrides', 'forced/ignored 必须是数组。');
  if (!Array.isArray(root.takes)) fail('root.takes', '必须是数组。');
  record(root.director, 'root.director');
  const render = record(root.render, 'root.render');
  if (render.width !== 1080 || render.height !== 1920 || render.fps !== 30) fail('root.render', '一期输出必须是 1080×1920、30fps。');
  record(root.authoring, 'root.authoring');
  record(root.production, 'root.production');
  return structuredClone(value) as TapTileProjectV2;
}
