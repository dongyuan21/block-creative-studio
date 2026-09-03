import { useEffect, useState } from 'react';
import {
  BROWSER_ASSET_CHANGE_EVENT,
  defaultBrowserAssetStore,
} from '../assets/browserAssetStore';
import type { ResolvedRenderPlan } from '../headless/contracts';
import {
  disposeBrowserRuntimeAssetBindings,
  resolveBrowserRuntimeAssetBindings,
  type BrowserRuntimeAssetBindings,
} from '../integration/browserRuntimeAssets';

const EMPTY_BINDINGS: BrowserRuntimeAssetBindings = {
  reference2d: {},
  objectUrls: [],
  missing: [],
};

export function useRuntimeAssetBindings(
  plan: ResolvedRenderPlan | null,
): BrowserRuntimeAssetBindings {
  const [bindings, setBindings] = useState<BrowserRuntimeAssetBindings>(EMPTY_BINDINGS);

  useEffect(() => {
    let active = true;
    let resolved: BrowserRuntimeAssetBindings | null = null;

    const load = async (): Promise<void> => {
      try {
        const next = await resolveBrowserRuntimeAssetBindings(
          plan,
          defaultBrowserAssetStore(),
        );
        if (!active) {
          disposeBrowserRuntimeAssetBindings(next);
          return;
        }
        resolved = next;
        setBindings(next);
      } catch {
        if (active) setBindings(EMPTY_BINDINGS);
      }
    };

    void load();
    const onChange = (): void => {
      if (resolved) {
        disposeBrowserRuntimeAssetBindings(resolved);
        resolved = null;
      }
      void load();
    };
    window.addEventListener(BROWSER_ASSET_CHANGE_EVENT, onChange);

    return () => {
      active = false;
      window.removeEventListener(BROWSER_ASSET_CHANGE_EVENT, onChange);
      disposeBrowserRuntimeAssetBindings(resolved);
    };
  }, [plan]);

  return bindings;
}
