import { useCallback, useState, type DragEvent } from "react";

export interface PendingFile {
  id: string;
  file: File;
  label: string;
}

export function FileDropZone({
  files,
  onFilesChange,
}: {
  files: PendingFile[];
  onFilesChange: (files: PendingFile[]) => void;
}) {
  const [dragActive, setDragActive] = useState(false);

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const pptxFiles = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".pptx"));
      const next: PendingFile[] = pptxFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        label: "",
      }));
      onFilesChange([...files, ...next]);
    },
    [files, onFilesChange],
  );

  return (
    <div>
      <div
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setDragActive(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-(--radius-lg) border-2 border-dashed px-8 py-12 text-center transition-colors ${
          dragActive ? "border-(--color-red) bg-(--color-red)/5" : "border-(--color-line-2)"
        }`}
      >
        <p className="font-display font-bold text-(--color-ink)">Drop 2+ .pptx files here</p>
        <p className="text-sm text-(--color-muted)">or</p>
        <label className="cursor-pointer rounded-(--radius-pill) border-2 border-(--color-line-2) px-4 py-2 text-sm font-semibold text-(--color-ink) hover:bg-(--color-elevation)">
          Browse files
          <input
            type="file"
            accept=".pptx"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
        <p className="mt-1 text-xs text-(--color-faint)">
          Files are parsed entirely in your browser — nothing is uploaded anywhere.
        </p>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {files.map((pf) => (
            <li
              key={pf.id}
              className="flex items-center gap-3 rounded-(--radius-md) border-2 border-(--color-line) bg-(--color-paper-2) px-4 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-(--color-ink)">{pf.file.name}</span>
              <input
                type="text"
                placeholder="Screen label (Wide, Twins, Pillars...)"
                value={pf.label}
                onChange={(e) =>
                  onFilesChange(files.map((f) => (f.id === pf.id ? { ...f, label: e.target.value } : f)))
                }
                className="w-56 rounded-(--radius-md) border-2 border-(--color-line) bg-(--color-paper) px-2.5 py-1.5 text-sm text-(--color-ink) outline-none focus:border-(--color-red)"
              />
              <button
                type="button"
                onClick={() => onFilesChange(files.filter((f) => f.id !== pf.id))}
                className="text-(--color-faint) hover:text-(--color-timeout)"
                aria-label={`Remove ${pf.file.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
