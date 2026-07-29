import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import type { DeckFingerprint, SlideFingerprint } from "./types";

const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

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

    return {
      slideIndex,
      slideId,
      textContent,
      textHash: djb2Hash(textContent),
      transition,
      // Build/animation timing-tree walk and media autoplay detection land in Phase 2.
      builds: [],
      buildClickCount: 0,
      media: [],
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
