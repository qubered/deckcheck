import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import type { BuildStep, DeckFingerprint, MediaNode, SlideFingerprint } from "./types";

const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

// ECMA-376's ST_TLTimeNodeType values that mark an actual build-step boundary
// (as opposed to the many un-typed <p:cTn> wrapper nodes used purely for
// grouping individual property-set behaviors inside a step).
const STEP_NODE_TYPES = new Set(["clickEffect", "withEffect", "afterEffect"]);

function triggerForNodeType(nodeType: string): BuildStep["trigger"] {
  if (nodeType === "clickEffect") return "onClick";
  if (nodeType === "afterEffect") return "afterPrevious";
  return "withPrevious";
}

// Native `DOMParser` only exists on `window`, not inside Web Workers (where all
// parsing here runs) — @xmldom/xmldom provides an equivalent DOM implementation
// in plain JS. Warnings are swallowed (we do our own skip-and-log), real/fatal
// errors are rethrown so callers can treat that slide/file as unparseable.
type XmlDocument = ReturnType<InstanceType<typeof DOMParser>["parseFromString"]>;

function parseXml(xml: string): XmlDocument {
  const parser = new DOMParser({
    onError: (level: string, message: string) => {
      if (level === "error" || level === "fatalError") throw new Error(message);
    },
  });
  return parser.parseFromString(xml, "text/xml");
}

type XmlElement = ReturnType<XmlDocument["getElementsByTagNameNS"]>[number];
type XmlNode = XmlElement["parentNode"];

function isElement(node: XmlNode): node is XmlElement {
  return node !== null && node.nodeType === 1;
}

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function normalizeText(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

interface OrderedSlide {
  rId: string | null;
  path: string; // full zip path, e.g. ppt/slides/slide3.xml
}

/**
 * Resolve slide order from presentation.xml's <p:sldIdLst> + presentation.xml.rels,
 * since slideN.xml file names don't necessarily match presentation order.
 * Falls back to numeric filename sort if the manifest can't be read.
 */
async function resolveSlideOrder(zip: JSZip): Promise<OrderedSlide[]> {
  try {
    const presXml = await zip.file("ppt/presentation.xml")?.async("text");
    const relsXml = await zip.file("ppt/_rels/presentation.xml.rels")?.async("text");
    if (!presXml || !relsXml) throw new Error("missing presentation manifest");

    const presDoc = parseXml(presXml);
    const relsDoc = parseXml(relsXml);

    const relTargetById = new Map<string, string>();
    for (const rel of Array.from(relsDoc.getElementsByTagName("Relationship"))) {
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) relTargetById.set(id, target);
    }

    const sldIds = Array.from(presDoc.getElementsByTagNameNS(P_NS, "sldId"));
    if (sldIds.length === 0) throw new Error("no sldId entries");

    const ordered: OrderedSlide[] = [];
    for (const sldId of sldIds) {
      const rId = sldId.getAttributeNS(R_NS, "id");
      const target = rId ? relTargetById.get(rId) : undefined;
      if (!target) continue;
      const path = target.startsWith("/") ? target.slice(1) : `ppt/${target}`;
      ordered.push({ rId, path });
    }
    if (ordered.length === 0) throw new Error("could not resolve any slide targets");
    return ordered;
  } catch {
    // Fallback: numeric sort of ppt/slides/slideN.xml
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    slideFiles.sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)![1]);
      const nb = Number(b.match(/slide(\d+)\.xml$/)![1]);
      return na - nb;
    });
    return slideFiles.map((path) => ({ rId: null, path }));
  }
}

function parseTransition(slideDoc: XmlDocument): SlideFingerprint["transition"] {
  const transitionEl = slideDoc.getElementsByTagNameNS(P_NS, "transition")[0];
  if (!transitionEl) {
    return { hasTransition: false, autoAdvanceMs: null, clickAdvance: true };
  }
  const advTmRaw = transitionEl.getAttribute("advTm");
  const advClickRaw = transitionEl.getAttribute("advClick");
  return {
    hasTransition: true,
    autoAdvanceMs: advTmRaw !== null ? Number(advTmRaw) : null,
    clickAdvance: advClickRaw !== null ? advClickRaw !== "0" && advClickRaw !== "false" : true,
  };
}

function parseSlideText(slideDoc: XmlDocument): string {
  const textNodes = Array.from(slideDoc.getElementsByTagNameNS(A_NS, "t"));
  return normalizeText(textNodes.map((n) => n.textContent ?? "").join(" "));
}

function collectTargetShapeIds(node: XmlElement): string[] {
  const ids = new Set<string>();
  for (const spTgt of Array.from(node.getElementsByTagNameNS(P_NS, "spTgt"))) {
    const spid = spTgt.getAttribute("spid");
    if (spid) ids.add(spid);
  }
  return Array.from(ids);
}

// Reads this step's own start-condition delay (in ms), e.g. `<p:stCondLst><p:cond delay="500"/></p:stCondLst>`.
// `delay="indefinite"` means "wait for the click that gates this step", not a real duration — null in that case.
function readDelayMs(node: XmlElement): number | null {
  const cond = node.getElementsByTagNameNS(P_NS, "stCondLst")[0]?.getElementsByTagNameNS(P_NS, "cond")[0];
  if (!cond) return null;
  const delay = cond.getAttribute("delay");
  if (!delay || delay === "indefinite") return null;
  const ms = Number(delay);
  return Number.isFinite(ms) ? ms : null;
}

// presetClass/presetID (e.g. "entr"/"2") identify the effect family+variant per ECMA-376's
// standard effect preset tables — not human names ("Fade", "Fly In"), but enough to tell decks
// apart. Best-effort: absent on nodes that don't carry a preset (e.g. plain media-play steps).
function readEffectType(node: XmlElement): string | null {
  const presetClass = node.getAttribute("presetClass");
  const presetId = node.getAttribute("presetID");
  if (!presetClass && !presetId) return null;
  return [presetClass, presetId].filter(Boolean).join(":");
}

// Walks up from a node (e.g. a <p:video>/<p:audio>) to the nearest ancestor <p:cTn> that carries
// a step-boundary nodeType, to resolve what triggers it — same click/withPrevious/afterPrevious
// vocabulary as build steps. No such ancestor (e.g. a media node parented directly under the root
// timing sequence) means it starts immediately with no click gating anywhere above it.
function nearestStepTrigger(node: XmlElement): BuildStep["trigger"] {
  let current: XmlNode = node.parentNode;
  while (isElement(current)) {
    if (current.namespaceURI === P_NS && current.localName === "cTn") {
      const nodeType = current.getAttribute("nodeType");
      if (nodeType && STEP_NODE_TYPES.has(nodeType)) return triggerForNodeType(nodeType);
    }
    current = current.parentNode;
  }
  return "withPrevious";
}

/**
 * Walks the slide's <p:timing> tree (§5.4) to extract click-triggered build steps and
 * media autoplay info. Absent <p:timing> (most slides, most decks) just means no builds/media —
 * not an error. Malformed sub-trees are caught by the caller and treated as skip-and-log.
 */
function parseBuildsAndMedia(slideDoc: XmlDocument): { builds: BuildStep[]; media: MediaNode[] } {
  const timing = slideDoc.getElementsByTagNameNS(P_NS, "timing")[0];
  if (!timing) return { builds: [], media: [] };

  const stepNodes = Array.from(timing.getElementsByTagNameNS(P_NS, "cTn")).filter((node) =>
    STEP_NODE_TYPES.has(node.getAttribute("nodeType") ?? ""),
  );

  const builds: BuildStep[] = [];
  let stepIndex = 0;
  for (const node of stepNodes) {
    const trigger = triggerForNodeType(node.getAttribute("nodeType")!);
    if (trigger !== "withPrevious" || stepIndex === 0) stepIndex++;
    builds.push({
      stepIndex,
      trigger,
      delayMs: readDelayMs(node),
      targetShapeIds: collectTargetShapeIds(node),
      effectType: readEffectType(node),
    });
  }

  const media: MediaNode[] = [];
  const mediaNodes = [
    ...Array.from(timing.getElementsByTagNameNS(P_NS, "video")),
    ...Array.from(timing.getElementsByTagNameNS(P_NS, "audio")),
  ];
  for (const node of mediaNodes) {
    const trigger = nearestStepTrigger(node);
    const shapeIds = collectTargetShapeIds(node);
    media.push({
      shapeId: shapeIds[0] ?? "",
      type: node.localName === "video" ? "video" : "audio",
      autoplay: trigger !== "onClick",
      durationMs: null, // out of scope for v1 — see spec §5.5
      trigger,
    });
  }

  return { builds, media };
}

function parseSlide(
  slideIndex: number,
  slideId: string,
  xml: string,
  warnings: string[],
): SlideFingerprint {
  try {
    const slideDoc = parseXml(xml);
    const textContent = parseSlideText(slideDoc);
    const transition = parseTransition(slideDoc);

    // A malformed/unusual timing tree shouldn't discard the text/transition data above —
    // isolate it so one bad animation node degrades to "no builds detected", not a lost slide.
    let builds: BuildStep[] = [];
    let media: MediaNode[] = [];
    try {
      ({ builds, media } = parseBuildsAndMedia(slideDoc));
    } catch (err) {
      warnings.push(
        `Slide ${slideIndex}: timing/animation data ${err instanceof Error ? err.message : "failed to parse"} — builds and media skipped for this slide`,
      );
    }

    return {
      slideIndex,
      slideId,
      textContent,
      textHash: djb2Hash(textContent),
      transition,
      builds,
      buildClickCount: builds.filter((b) => b.trigger === "onClick").length,
      media,
    };
  } catch (err) {
    warnings.push(`Slide ${slideIndex}: ${err instanceof Error ? err.message : "failed to parse"} — skipped, treated as empty`);
    return {
      slideIndex,
      slideId,
      textContent: "",
      textHash: djb2Hash(""),
      transition: { hasTransition: false, autoAdvanceMs: null, clickAdvance: true },
      builds: [],
      buildClickCount: 0,
      media: [],
    };
  }
}

export async function parsePptx(
  deckId: string,
  filename: string,
  userLabel: string | null,
  buffer: ArrayBuffer,
  onProgress?: (slidesParsed: number, totalSlides: number) => void,
): Promise<DeckFingerprint> {
  const warnings: string[] = [];
  const zip = await JSZip.loadAsync(buffer);
  const order = await resolveSlideOrder(zip);

  const slides: SlideFingerprint[] = [];
  for (let i = 0; i < order.length; i++) {
    const { rId, path } = order[i];
    const file = zip.file(path);
    const slideIndex = i + 1;
    const slideId = rId ?? path;
    if (!file) {
      warnings.push(`Slide ${slideIndex}: referenced file ${path} not found in archive — skipped, treated as empty`);
      slides.push({
        slideIndex,
        slideId,
        textContent: "",
        textHash: djb2Hash(""),
        transition: { hasTransition: false, autoAdvanceMs: null, clickAdvance: true },
        builds: [],
        buildClickCount: 0,
        media: [],
      });
    } else {
      const xml = await file.async("text");
      slides.push(parseSlide(slideIndex, slideId, xml, warnings));
    }
    onProgress?.(slideIndex, order.length);
  }

  return {
    deckId,
    filename,
    userLabel,
    slideCount: slides.length,
    slides,
    warnings,
  };
}
