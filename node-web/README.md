# ItemsAdder 单包 Web 迁移器

这个版本用于把 `ItemsAdder/contents` 里的单个子文件夹转换成 CraftEngine resources 包。文件解析、YAML 转换、资源打包都在浏览器里完成，Vercel 只负责托管静态前端。

## 本地运行

```powershell
cd node-web
npm install
npm run dev
```

## 部署到 Vercel

- Root Directory: `node-web`
- Build Command: `npm run build`
- Output Directory: `dist`

## 使用

把 `contents` 里面的单个文件夹拖进去，例如：

```text
ItemsAdder/contents/test
```

下载得到：

```text
test_craftengine.zip
```

zip 内会包含：

```text
<namespace>/pack.yml
<namespace>/configuration/itemsadder_converted.yml
<namespace>/resourcepack/assets/...
_itemsadder_migration_report.json
```
