import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  FolderUp,
  Loader2,
  Settings2,
} from "lucide-react";
import { migrateSinglePack, type MigrationOptions, type MigrationResult, type UploadFile } from "./lib/migrator";

type WebkitEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (success: (file: File) => void, failure?: (error: DOMException) => void) => void;
  createReader?: () => {
    readEntries: (success: (entries: WebkitEntry[]) => void, failure?: (error: DOMException) => void) => void;
  };
};

type DirectoryDropItem = DataTransferItem & {
  webkitGetAsEntry?: () => WebkitEntry | null;
};

function fileListToUploads(fileList: FileList | File[]): UploadFile[] {
  return Array.from(fileList).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}

async function readDirectoryEntries(entry: WebkitEntry): Promise<WebkitEntry[]> {
  const reader = entry.createReader?.();
  if (!reader) {
    return [];
  }

  const entries: WebkitEntry[] = [];
  while (true) {
    const batch = await new Promise<WebkitEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (!batch.length) {
      break;
    }
    entries.push(...batch);
  }
  return entries;
}

async function traverseEntry(entry: WebkitEntry, path: string): Promise<UploadFile[]> {
  const readFile = entry.file;
  if (entry.isFile && readFile) {
    const file = await new Promise<File>((resolve, reject) => readFile(resolve, reject));
    return [{ file, path }];
  }
  if (!entry.isDirectory) {
    return [];
  }

  const children = await readDirectoryEntries(entry);
  const nested = await Promise.all(children.map((child) => traverseEntry(child, `${path}/${child.name}`)));
  return nested.flat();
}

async function dataTransferToUploads(dataTransfer: DataTransfer): Promise<UploadFile[]> {
  const items = Array.from(dataTransfer.items ?? []) as DirectoryDropItem[];
  const entries = items
    .map((item) => {
      const getEntry = (item as DirectoryDropItem).webkitGetAsEntry;
      return getEntry ? getEntry() : null;
    })
    .filter((entry): entry is WebkitEntry => entry !== null);
  if (!entries.length) {
    return fileListToUploads(dataTransfer.files);
  }

  const nested = await Promise.all(entries.map((entry) => traverseEntry(entry, entry.name)));
  return nested.flat();
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pickNumber(summary: Record<string, unknown> | null, key: string): number {
  const value = summary?.[key];
  return typeof value === "number" ? value : 0;
}

function pickTotals(summary: Record<string, unknown> | null): Record<string, number> {
  const totals = summary?.totals;
  if (!totals || typeof totals !== "object" || Array.isArray(totals)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(totals as Record<string, unknown>).filter(([, value]) => typeof value === "number"),
  ) as Record<string, number>;
}

export default function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [options, setOptions] = useState<MigrationOptions>({
    packAuthor: "ItemsAdder migration",
    packVersion: "1.0",
    includeAssets: true,
  });

  const totals = useMemo(() => pickTotals(result?.summary ?? null), [result]);

  async function runMigration(files: UploadFile[]) {
    setError(null);
    setResult(null);
    setFileCount(files.length);
    if (!files.length) {
      setError("没有读取到文件。");
      return;
    }

    setIsConverting(true);
    try {
      const migrated = await migrateSinglePack(files, options);
      setResult(migrated);
      downloadBlob(migrated.blob, migrated.fileName);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : String(unknownError));
    } finally {
      setIsConverting(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    await runMigration(await dataTransferToUploads(event.dataTransfer));
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="title-row">
          <div>
            <p className="eyebrow">CraftEngine</p>
            <h1>ItemsAdder 单包迁移</h1>
          </div>
          <div className="status-pill">
            <span className="status-dot" />
            浏览器本地处理
          </div>
        </div>

        <div
          className={`drop-zone${isDragging ? " is-dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            multiple
            {...{ webkitdirectory: "", directory: "" }}
            onChange={(event) => {
              void runMigration(fileListToUploads(event.currentTarget.files ?? []));
            }}
          />
          <div className="drop-icon">
            {isConverting ? <Loader2 className="spin" size={28} /> : <FolderUp size={28} />}
          </div>
          <div>
            <h2>{isConverting ? "转换中" : "拖入 content 子文件夹"}</h2>
            <p>例如 `contents/test`，输出 `test_craftengine.zip`。</p>
          </div>
          <button className="button primary" type="button" onClick={() => inputRef.current?.click()} disabled={isConverting}>
            <FolderUp size={16} />
            选择文件夹
          </button>
        </div>

        <section className="settings-panel" aria-label="转换设置">
          <div className="panel-heading">
            <Settings2 size={17} />
            <span>设置</span>
          </div>
          <label className="field">
            <span>作者</span>
            <input
              value={options.packAuthor}
              onChange={(event) => setOptions((current) => ({ ...current, packAuthor: event.target.value }))}
            />
          </label>
          <label className="field compact">
            <span>版本</span>
            <input
              value={options.packVersion}
              onChange={(event) => setOptions((current) => ({ ...current, packVersion: event.target.value }))}
            />
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={options.includeAssets}
              onChange={(event) => setOptions((current) => ({ ...current, includeAssets: event.target.checked }))}
            />
            <span>打包 resourcepack/assets</span>
          </label>
        </section>

        {(error || result) && (
          <section className={`result-panel${error ? " has-error" : ""}`}>
            <div className="result-heading">
              {error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{error ? "转换失败" : "转换完成"}</span>
            </div>

            {error ? (
              <p className="message">{error}</p>
            ) : (
              <>
                <div className="stats-grid">
                  <div>
                    <span>文件</span>
                    <strong>{fileCount}</strong>
                  </div>
                  <div>
                    <span>物品</span>
                    <strong>{totals.items ?? 0}</strong>
                  </div>
                  <div>
                    <span>贴图</span>
                    <strong>{totals.images ?? 0}</strong>
                  </div>
                  <div>
                    <span>报错</span>
                    <strong>{pickNumber(result?.summary ?? null, "yaml_errors")}</strong>
                  </div>
                </div>
                <div className="download-row">
                  <div className="archive-name">
                    <FileArchive size={17} />
                    <span>{result?.fileName}</span>
                  </div>
                  <button className="button" type="button" onClick={() => result && downloadBlob(result.blob, result.fileName)}>
                    <Download size={16} />
                    下载
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
