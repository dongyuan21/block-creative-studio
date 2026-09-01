# 发布到 GitHub

当前交付同时提供源码 ZIP 和保留提交历史的 Git Bundle。

## 推荐：从 Git Bundle 建仓

```bash
git clone -b main block-creative-studio-phase1-v0.1.4.bundle block-creative-studio
cd block-creative-studio
git remote set-url origin git@github.com:dongyuan21/block-creative-studio.git
git push -u origin main --follow-tags
```

前提是在 GitHub 账号 `dongyuan21` 下先创建一个空仓库 `block-creative-studio`，不要勾选自动生成 README、License 或 `.gitignore`。

## 使用源码 ZIP

解压后：

```bash
cd block-creative-studio-phase1-v0.1.4
git init -b main
git add .
git commit -m "feat: bootstrap Block Creative Studio phase one"
git remote add origin git@github.com:dongyuan21/block-creative-studio.git
git push -u origin main
```

源码 ZIP 不包含 `.git`，Git Bundle 包含完整提交历史。

## 也可以让脚本创建并推送仓库

解压源码 ZIP 或从 Git Bundle 克隆后，确保已经执行 `gh auth login`，然后运行：

```bash
./scripts/publish-github.sh dongyuan21 block-creative-studio public
```

脚本会复用已存在仓库；仓库不存在时，通过 GitHub CLI 创建后推送 `main` 与全部版本标签。
