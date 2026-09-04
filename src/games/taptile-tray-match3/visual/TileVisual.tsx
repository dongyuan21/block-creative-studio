import type { CSSProperties } from 'react';
import { tapTileMaterialAppearance } from './materialAppearance';
import type { ResolvedTileVisual } from './types';

type VisualStyle = CSSProperties & Record<`--${string}`, string | number>;

export function TileVisual({ visual }: { visual: ResolvedTileVisual }) {
  const material = tapTileMaterialAppearance(visual.material);
  const style: VisualStyle = {
    '--tile-visual-fill': visual.bodyStyle.fill ?? material.fillStops[0]?.[1] ?? '#fff7e7',
    '--tile-visual-radius': `${visual.bodyStyle.cornerRadiusPx}px`,
    '--tile-visual-border': `${visual.bodyStyle.borderWidthPx}px`,
    '--tile-role-scale': visual.roleScale,
    '--tile-keyline-color': material.keylineColor,
    '--tile-keyline-width': `${Math.max(0.7, visual.bodyStyle.borderWidthPx * 0.72)}px`,
    '--tile-contact-shadow-color': material.contactShadowColor,
    '--tile-shadow-color': material.shadowColor,
    '--tile-shadow-blur': `${Math.max(2, visual.bodyStyle.cornerRadiusPx * 0.3)}px`,
    '--tile-shadow-x': `${Math.max(1, visual.bodyStyle.cornerRadiusPx * 0.12)}px`,
    '--tile-shadow-y': `${Math.max(2, visual.bodyStyle.cornerRadiusPx * 0.3)}px`,
    ...(visual.bodyAsset?.uri ? { '--tile-body-image': `url("${visual.bodyAsset.uri}")` } : {}),
  };
  return (
    <span
      className={`tpt-tile-visual mode-${visual.renderedFace.mode} material-${visual.material}`}
      data-presentation-role={visual.role}
      data-tile-material={visual.material}
      data-visual-archetype={visual.archetype.id}
      data-visual-identity={visual.identityHash}
      data-face-assembly={visual.faceAssembly.id}
      data-body-style={visual.bodyStyle.id}
      style={style}
    >
      {visual.renderedFace.parts.map((part) => {
        const partStyle: CSSProperties = {
          left: `${part.transform.x * 100}%`,
          top: `${part.transform.y * 100}%`,
          width: `${Math.abs(part.transform.scaleX) * 100}%`,
          height: `${Math.abs(part.transform.scaleY) * 100}%`,
          opacity: part.transform.opacity,
          transform: `translate(-50%, -50%) rotate(${part.transform.rotationDeg}deg)`,
        };
        return (
          <span key={part.id} className="tpt-face-part" style={partStyle}>
            {part.source.kind === 'glyph'
              ? <span className="tpt-face-glyph">{part.source.value}</span>
              : part.source.asset.uri
                ? <img src={part.source.asset.uri} alt="" draggable={false} />
                : <span className="tpt-face-missing" title={`IndexedDB asset ${part.source.assetId} 尚未加载`}>!</span>}
          </span>
        );
      })}
    </span>
  );
}
