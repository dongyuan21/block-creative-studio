# Reference-first 2D specification

本目录是从用户提供的真机试玩录像提取出的第一版可执行规格。它是后续 2D 复刻、回归测试、可替换原子和 3D 泛化的共同依据。

- [`VIDEO_ANALYSIS_V1.md`](VIDEO_ANALYSIS_V1.md)：布局与表现系统总结。
- [`LAYOUT_V1.json`](LAYOUT_V1.json)：源坐标和归一化坐标。
- [`ATOM_CATALOG_V1.json`](ATOM_CATALOG_V1.json)：可替换原子目录及证据状态。
- [`TIMING_OBSERVATIONS_V1.md`](TIMING_OBSERVATIONS_V1.md)：代表性时间窗口与导演参数。
- [`SCORING_OBSERVATIONS_V1.md`](SCORING_OBSERVATIONS_V1.md)：已确认计分与未解决公式。

证据标签：

- `observed`：录像中可直接观察。
- `inferred`：由多帧行为合理推断，但需要更多样本验证。
- `unresolved`：当前不应写死或声称一致。
