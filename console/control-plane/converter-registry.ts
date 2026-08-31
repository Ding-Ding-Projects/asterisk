import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONVERTER_CATEGORIES,
  type ConverterAdapter,
  type ConverterBundleProof,
  type ConverterCategory,
  type ConverterCategoryDescriptor,
  type ConverterFormat,
  type ConverterKernelId,
  type ConverterOutputValidation,
} from "../shared/converter.js";

export const CONVERTER_CATEGORY_CATALOG: ReadonlyArray<ConverterCategoryDescriptor> = [
  { id: "documents-pdf", label: "Documents and PDF", description: "Document and PDF inspection or transformation." },
  { id: "images", label: "Images", description: "Raster and vector image conversion." },
  { id: "audio", label: "Audio", description: "Audio container and codec conversion." },
  { id: "video", label: "Video", description: "Video container and codec conversion." },
  { id: "archives", label: "Archives", description: "Archive creation and extraction." },
  { id: "structured-data-spreadsheets", label: "Structured data and spreadsheets", description: "Structured records and spreadsheet documents." },
  { id: "code-text", label: "Code and text", description: "Text encodings and source-oriented transformations." },
  { id: "binary-encodings", label: "Binary encodings", description: "Lossless representations of arbitrary bytes." },
];

export const CONVERTER_FORMATS: ReadonlyArray<ConverterFormat> = [
  format("application/pdf", "PDF", "documents-pdf", ["application/pdf"], ["pdf"], true),
  format("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Word document", "documents-pdf", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], ["docx"], true),
  format("image/png", "PNG image", "images", ["image/png"], ["png"], true),
  format("image/jpeg", "JPEG image", "images", ["image/jpeg"], ["jpg", "jpeg"], true),
  format("image/webp", "WebP image", "images", ["image/webp"], ["webp"], true),
  format("audio/wav", "WAVE audio", "audio", ["audio/wav", "audio/x-wav"], ["wav"], true),
  format("audio/ogg", "Ogg audio", "audio", ["audio/ogg"], ["ogg", "opus"], true),
  format("audio/flac", "FLAC audio", "audio", ["audio/flac"], ["flac"], true),
  format("video/mp4", "MP4 video", "video", ["video/mp4"], ["mp4", "m4v"], true),
  format("video/webm", "WebM video", "video", ["video/webm"], ["webm"], true),
  format("application/zip", "ZIP archive", "archives", ["application/zip"], ["zip"], true),
  format("application/x-7z-compressed", "7z archive", "archives", ["application/x-7z-compressed"], ["7z"], true),
  format("application/gzip", "Gzip archive", "archives", ["application/gzip"], ["gz", "tgz"], true),
  format("application/json", "JSON", "structured-data-spreadsheets", ["application/json"], ["json"], false),
  format("text/csv", "CSV", "structured-data-spreadsheets", ["text/csv"], ["csv"], false),
  format("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Excel workbook", "structured-data-spreadsheets", ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], ["xlsx"], true),
  format("text/utf8", "UTF-8 text", "code-text", ["text/plain; charset=utf-8"], ["txt", "md", "csv", "ts", "js", "json"], false),
  format("encoding/base64", "Base64 text", "binary-encodings", ["text/plain; profile=base64"], ["b64", "base64"], false),
  format("encoding/hex", "Hexadecimal text", "binary-encodings", ["text/plain; profile=hex"], ["hex"], false),
  format("application/octet-stream", "Binary data", "binary-encodings", ["application/octet-stream"], ["bin"], true),
];

const FIXED_WORKER_RUNTIME = "fixed-worker-kernel-v1";

export interface ConverterRegistryProofs {
  fixedWorkerKernel?: ConverterBundleProof;
}

export class ConverterRegistry {
  readonly #adapters: ReadonlyArray<ConverterAdapter>;

  private constructor(fixedWorkerProof?: ConverterBundleProof) {
    this.#adapters = [
      builtinAdapter(
        "utf8-to-base64",
        "UTF-8 text to Base64",
        "binary-encodings",
        ["text/utf8", "application/json", "text/csv"],
        "encoding/base64",
        "builtin:utf8-to-base64",
        { kind: "base64-text" },
        fixedWorkerProof,
        "Text is decoded strictly as UTF-8, then represented as Base64. No source bytes are changed.",
      ),
      builtinAdapter(
        "base64-to-binary",
        "Base64 to binary data",
        "binary-encodings",
        ["encoding/base64"],
        "application/octet-stream",
        "builtin:base64-to-binary",
        { kind: "binary-nonempty" },
        fixedWorkerProof,
        "Whitespace is ignored and strict Base64 syntax is required. The destination has no more specific media type than arbitrary binary data.",
      ),
      builtinAdapter(
        "binary-to-hex",
        "Binary data to hexadecimal text",
        "binary-encodings",
        ["application/octet-stream", "application/pdf", "image/png", "image/jpeg", "image/webp", "audio/wav", "audio/ogg", "audio/flac", "video/mp4", "video/webm", "application/zip", "application/x-7z-compressed", "application/gzip"],
        "encoding/hex",
        "builtin:binary-to-hex",
        { kind: "hex-text" },
        fixedWorkerProof,
        "Every input byte becomes two lowercase hexadecimal characters. The result is larger but lossless.",
      ),
      builtinAdapter(
        "hex-to-binary",
        "Hexadecimal text to binary data",
        "binary-encodings",
        ["encoding/hex"],
        "application/octet-stream",
        "builtin:hex-to-binary",
        { kind: "binary-nonempty" },
        fixedWorkerProof,
        "Whitespace is ignored and strict even-length hexadecimal syntax is required. The destination has no more specific media type than arbitrary binary data.",
      ),
      builtinAdapter(
        "normalize-utf8",
        "Normalize UTF-8 text line endings",
        "code-text",
        ["text/utf8", "application/json", "text/csv"],
        "text/utf8",
        "builtin:normalize-utf8",
        { kind: "utf8-text" },
        fixedWorkerProof,
        "Line endings become LF and a final newline is added. Byte order marks are removed; all other Unicode text is preserved.",
        true,
      ),
      unavailableAdapter("pdf-toolkit", "PDF inspect, split, merge, extract, reorder, rotate, and metadata", "documents-pdf", ["application/pdf"], "application/pdf", "qpdf or another packaged PDF toolkit", "The packaged application does not contain a verified PDF toolkit. PDF operations stay disabled until a bundled offline adapter is proven in the packaged artifact.", ["inspect", "split", "merge", "extract", "reorder", "rotate", "metadata"]),
      unavailableAdapter("office-to-pdf", "Office documents to PDF", "documents-pdf", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], "application/pdf", "LibreOffice headless runtime", "No verified LibreOffice runtime is bundled. A PATH installation or network service is never treated as an available adapter."),
      unavailableAdapter("image-raster", "PNG, JPEG, and WebP conversion", "images", ["image/png", "image/jpeg", "image/webp"], "image/png", "Sharp/libvips image runtime", "No verified Sharp/libvips runtime is bundled, so image conversion is unavailable rather than delegated to a machine-wide tool."),
      unavailableAdapter("audio-transcode", "Audio transcoding", "audio", ["audio/wav", "audio/ogg", "audio/flac"], "audio/wav", "FFmpeg audio runtime", "No verified FFmpeg runtime is bundled. PATH discovery and remote conversion services are intentionally ignored."),
      unavailableAdapter("video-transcode", "Video transcoding", "video", ["video/mp4", "video/webm"], "video/mp4", "FFmpeg video runtime", "No verified FFmpeg runtime is bundled. PATH discovery and remote conversion services are intentionally ignored."),
      unavailableAdapter("archive-tools", "ZIP, 7z, and gzip conversion", "archives", ["application/zip", "application/x-7z-compressed", "application/gzip"], "application/zip", "7-Zip runtime", "No verified 7-Zip runtime is bundled, so archive conversion and extraction remain unavailable."),
      unavailableAdapter("spreadsheet-tools", "CSV, JSON, and workbook conversion", "structured-data-spreadsheets", ["text/csv", "application/json", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], "application/json", "LibreOffice Calc or a verified spreadsheet parser", "No verified spreadsheet adapter is bundled. The catalog remains visible, but it will not guess workbook or CSV semantics."),
      unavailableAdapter("document-text-tools", "Document and markup conversion", "code-text", ["text/utf8"], "text/utf8", "Pandoc runtime", "No verified Pandoc runtime is bundled. Machine-wide tools and network converters are not considered available."),
    ];
    assertCatalogComplete(this.#adapters);
  }

  static async create(proofs: ConverterRegistryProofs = {}): Promise<ConverterRegistry> {
    const suppliedProof = proofs.fixedWorkerKernel ?? await discoverBundledWorkerProof();
    const fixedWorkerProof = await verifiedProof(suppliedProof, FIXED_WORKER_RUNTIME);
    return new ConverterRegistry(fixedWorkerProof);
  }

  categories(): ReadonlyArray<ConverterCategoryDescriptor> {
    return CONVERTER_CATEGORY_CATALOG;
  }

  formats(): ReadonlyArray<ConverterFormat> {
    return CONVERTER_FORMATS;
  }

  adapters(): ReadonlyArray<ConverterAdapter> {
    return this.#adapters;
  }

  adaptersForCategory(category: ConverterCategory): ReadonlyArray<ConverterAdapter> {
    return this.#adapters.filter((adapter) => adapter.category === category);
  }

  format(id: string): ConverterFormat | undefined {
    return CONVERTER_FORMATS.find((entry) => entry.id === id);
  }

  adapter(id: string): ConverterAdapter | undefined {
    return this.#adapters.find((entry) => entry.id === id);
  }

  requireEnabledAdapter(id: string): ConverterAdapter {
    const adapter = this.adapter(id);
    if (!adapter) throw new Error(`Unknown converter adapter: ${id}`);
    if (adapter.availability.state !== "enabled") {
      throw new Error(`${adapter.label} is unavailable: ${adapter.availability.reason}`);
    }
    return adapter;
  }
}

/**
 * The fixed worker source is compiled beside this module and shipped inside the
 * application bundle. In a source checkout the TypeScript module is not proof of a
 * packaged runtime, so discovery intentionally returns no proof there. The hash is
 * measured from the exact bundled JavaScript file each time rather than copied from
 * a hand-maintained constant.
 */
async function discoverBundledWorkerProof(): Promise<ConverterBundleProof | undefined> {
  const artifactPath = fileURLToPath(new URL('./converter-runner.js', import.meta.url));
  if (!artifactPath.toLowerCase().endsWith('.js')) return undefined;
  try {
    const info = await lstat(artifactPath);
    if (info.isSymbolicLink() || !info.isFile()) return undefined;
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(artifactPath)) hash.update(chunk);
    return {
      proofId: `bundled-fixed-worker:${hash.copy().digest('hex').slice(0, 16)}`,
      adapterRuntime: FIXED_WORKER_RUNTIME,
      artifactPath,
      artifactSha256: hash.digest('hex'),
      verifiedAt: new Date().toISOString(),
      bundled: true,
      offline: true,
      packagedArtifact: true,
    };
  } catch {
    return undefined;
  }
}

function format(
  id: string,
  label: string,
  category: ConverterCategory,
  mediaTypes: ReadonlyArray<string>,
  extensions: ReadonlyArray<string>,
  binary: boolean,
): ConverterFormat {
  return { id, label, category, mediaTypes, extensions, binary };
}

async function verifiedProof(
  proof: ConverterBundleProof | undefined,
  expectedRuntime: string,
): Promise<ConverterBundleProof | undefined> {
  if (!proof) return undefined;
  if (
    proof.adapterRuntime !== expectedRuntime ||
    proof.bundled !== true ||
    proof.offline !== true ||
    proof.packagedArtifact !== true ||
    !isAbsolute(proof.artifactPath) ||
    !/^[0-9a-f]{64}$/u.test(proof.artifactSha256) ||
    !Number.isFinite(Date.parse(proof.verifiedAt)) ||
    proof.proofId.trim().length === 0
  ) {
    return undefined;
  }
  try {
    const info = await lstat(proof.artifactPath);
    if (info.isSymbolicLink() || !info.isFile()) return undefined;
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(proof.artifactPath)) hash.update(chunk);
    if (hash.digest("hex") !== proof.artifactSha256) return undefined;
    return proof;
  } catch {
    return undefined;
  }
}

function builtinAdapter(
  id: string,
  label: string,
  category: ConverterCategory,
  sourceFormats: ReadonlyArray<string>,
  targetFormat: string,
  kernel: ConverterKernelId,
  outputValidation: ConverterOutputValidation,
  proof: ConverterBundleProof | undefined,
  disclosure: string,
  lossy = false,
): ConverterAdapter {
  return {
    id,
    label,
    category,
    sourceFormats,
    targetFormat,
    availability: proof
      ? { state: "enabled", proof }
      : {
          state: "unavailable",
          missingDependency: FIXED_WORKER_RUNTIME,
          reason: "The fixed converter worker has not been proven inside the packaged application. Source-tree availability alone cannot enable this adapter.",
        },
    sandbox: { kind: "fixed-worker-kernel", network: "disabled", shell: false, kernel },
    limits: {
      maxInputBytes: 16 * 1024 * 1024,
      maxOutputBytes: 40 * 1024 * 1024,
      timeoutMs: 30_000,
      memoryMb: 128,
      maxTemporaryBytes: 40 * 1024 * 1024,
    },
    outputValidation,
    lossy,
    disclosureIds: [`${id}:representation-change`],
    disclosures: [disclosure],
    metadataBehavior: "No file metadata is copied to the destination. The source file is never modified.",
    encodingBehavior: disclosure,
  };
}

function unavailableAdapter(
  id: string,
  label: string,
  category: ConverterCategory,
  sourceFormats: ReadonlyArray<string>,
  targetFormat: string,
  missingDependency: string,
  reason: string,
  pdfOperations?: ConverterAdapter["pdfOperations"],
): ConverterAdapter {
  return {
    id,
    label,
    category,
    sourceFormats,
    targetFormat,
    availability: { state: "unavailable", missingDependency, reason },
    sandbox: { kind: "allowlisted-process", network: "disabled", shell: false },
    limits: {
      maxInputBytes: 0,
      maxOutputBytes: 0,
      timeoutMs: 0,
      memoryMb: 0,
      maxTemporaryBytes: 0,
    },
    outputValidation: pdfOperations ? { kind: "pdf-reopen" } : { kind: "sniffed-format", expectedFormat: targetFormat },
    lossy: true,
    disclosureIds: [`${id}:unavailable`],
    disclosures: [reason],
    metadataBehavior: "Unavailable adapters do not read, write, or alter metadata.",
    encodingBehavior: "Unavailable adapters produce no output.",
    pdfOperations,
  };
}

function assertCatalogComplete(adapters: ReadonlyArray<ConverterAdapter>): void {
  const categories = new Set(adapters.map((adapter) => adapter.category));
  for (const category of CONVERTER_CATEGORIES) {
    if (!categories.has(category)) throw new Error(`Converter category ${category} has no catalog adapter.`);
  }
  const formatIds = new Set(CONVERTER_FORMATS.map((entry) => entry.id));
  for (const adapter of adapters) {
    for (const source of adapter.sourceFormats) {
      if (!formatIds.has(source)) throw new Error(`Adapter ${adapter.id} names unknown source format ${source}.`);
    }
    if (!formatIds.has(adapter.targetFormat)) {
      throw new Error(`Adapter ${adapter.id} names unknown target format ${adapter.targetFormat}.`);
    }
    if (adapter.availability.state === "enabled" && adapter.sandbox.kind === "allowlisted-process" && !adapter.sandbox.allowedExecutable) {
      throw new Error(`Enabled process adapter ${adapter.id} has no allowlisted executable.`);
    }
  }
}
