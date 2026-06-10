# ItemsAdder to CraftEngine Migrator

ai写的把 ItemsAdder 的 `contents` 批量迁移到 CraftEngine 的 `resources`。

## 准备

- Python 3
- Python 依赖：`PyYAML`

安装依赖：

```powershell
pip install pyyaml
```

## 使用

在本文件夹打开 PowerShell，执行：

```powershell
python .\migrate_itemsadder_to_craftengine.py --source "D:\server\plugins\ItemsAdder\contents" --target "D:\server\plugins\CraftEngine\resources" --overwrite
```

只预览不写入：

```powershell
python .\migrate_itemsadder_to_craftengine.py --source "D:\server\plugins\ItemsAdder\contents" --target "D:\server\plugins\CraftEngine\resources" --dry-run
```

## 会转换的内容

- items
- font_images -> images
- categories
- equipments
- furniture
- blocks
- resourcepack/assets 资源文件

## 注意

- 脚本可重复运行，重新迁移时加 `--overwrite`。
- 目标资源路径会写到 `resources\<namespace>\resourcepack\assets\...`。
- `entities`、`nbt`、`events` 不会自动转换，会写进迁移报告，避免盲转。
- 3D 头盔会按 CraftEngine 的 3D 头盔方式生成 `data.equippable.slot: head`。
- 家具默认整体抬升 `0.5` 格。

迁移完成后，查看报告：

```text
D:\server\plugins\CraftEngine\resources\_itemsadder_migration_report.json
```

## Node Web 单包版本

`node-web/` 是给 Vercel 部署的浏览器前端版本，用来处理 `contents` 里面的单个子文件夹，例如只拖入 `contents/test`。

```powershell
cd node-web
npm install
npm run dev
```

Vercel 设置：

- Root Directory: `node-web`
- Build Command: `npm run build`
- Output Directory: `dist`

前端会在浏览器里解析 YAML、复制 `resourcepack/assets`，并下载 CraftEngine resources zip。

测试链接 https://ia.grep.moe