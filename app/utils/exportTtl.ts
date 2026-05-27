import type { AppState, FrontmatterData } from "~/utils/flowStorage";
import type { DoctypeField, DocumentEntry, DocumentPosition } from "~/state";

const MONODI_NS = "http://olyro.de/mondiview/";
const DATA_NS = "http://monodicum/";

/** Convert a user-supplied name to a camelCase URI slug. */
function toSlug(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\u00C0-\u024F ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => (i === 0 ? word[0].toLowerCase() + word.slice(1) : word[0].toUpperCase() + word.slice(1)))
    .join("");
}

/** Remove the file extension from a filename. */
function stemOf(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

/** Sanitise a filename stem for use as an URI local name. */
function fileSlug(filename: string): string {
  return stemOf(filename).replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Escape a string for use inside a Turtle double-quoted literal. */
function escapeTtl(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

/** Escape a string for use inside a Turtle triple-quoted (long) literal. */
function escapeTtlLong(value: string): string {
  // Only backslashes and embedded triple-quotes need escaping in long literals.
  return value.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
}

/** Generate the frontmatter TTL block for viewer configuration. */
function generateFrontmatterTtl(fm: FrontmatterData): string[] {
  const lines: string[] = ["# Viewer configuration (frontmatter)", ""];

  const textField = (prop: string, value: string) => {
    lines.push(`:${prop} :hasContent "${escapeTtl(value)}"@de .`);
  };

  const longField = (prop: string, value: string, langTag?: string) => {
    const tag = langTag ? `@${langTag}` : "";
    lines.push(`:${prop} :hasContent """\n${escapeTtlLong(value)}\n"""${tag} .`);
  };

  textField("tabTitle", fm.tabTitle);
  textField("headerTitle", fm.headerTitle);
  textField("copyright", fm.copyright);
  longField("footer", fm.footer, "de");
  longField("mainPagePreSearches", fm.mainPagePreSearches, "de");
  longField("mainPagePostSearches", fm.mainPagePostSearches, "de");
  longField("customJavascript", fm.customJavascript);
  longField("customCss", fm.customCss);

  lines.push("");
  return lines;
}

/** Map a DocumentPosition slug to the Turtle blank-node key. */
const DOC_POSITION_KEY: Record<DocumentPosition, string> = {
  ":main": ":main",
  ":header": ":header",
  ":right": ":right",
  ":download": ":download",
  ":sticky": ":sticky",
};

export function generateTtl(state: AppState): string {
  const doctypes = state.doctypes ?? [];
  const language = 'de';

  const version = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const lines: string[] = [
    "@prefix :     <" + MONODI_NS + "> .",
    "@prefix data: <" + DATA_NS + "> .",
    "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
    "@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .",
    "@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .",
    "",
    "# Version",
    "data:version a rdf:Property .",
    `data:version rdfs:label "${version}" .`,
    "",
  ];

  // ---------- frontmatter ----------
  if (state.frontmatter) {
    lines.push(...generateFrontmatterTtl(state.frontmatter));
  }

  // ---------- schema ----------

  for (const doctypeEntry of doctypes) {
    const doctypeName = doctypeEntry.name;
    const fields = doctypeEntry.fields;
    const classSlug = toSlug(doctypeName);

    lines.push(`# Class: ${doctypeName}`);
    lines.push(`data:${classSlug}`);
    lines.push(`  a rdfs:Class ;`);
    lines.push(`  rdfs:label "${escapeTtl(doctypeName)}"@${language} ;`);
    lines.push(`  :shortUrlTag "${escapeTtl(classSlug)}" .`);
    lines.push("");

    let searchOrder = 1;
    let headerOrder = 1;

    // Main document property — always emitted; position order starts at 1
    const mainDocType = doctypeEntry.mainDocumentType ?? "pdf";
    const mainDocRange = mainDocType === "pdf" ? ":pdf" : ":htmlContent";
    const mainDocPropSlug = `${classSlug}Document`;

    lines.push(`data:${mainDocPropSlug}`);
    lines.push(`  a rdf:Property ;`);
    lines.push(`  rdfs:label "Dokument"@${language} ;`);
    lines.push(`  rdfs:domain data:${classSlug} ;`);
    lines.push(`  rdfs:range ${mainDocRange} ;`);
    lines.push(`  :documentPosition [ :main 1 ] .`);
    lines.push("");

    // Attribute positions start at 2 to leave room above the main document

    for (const field of fields) {
      const propSlug = classSlug + toSlug(field.name).replace(/^./, (c) => c.toUpperCase());

      lines.push(`data:${propSlug}`);
      lines.push(`  a rdf:Property ;`);
      lines.push(`  rdfs:label "${escapeTtl(field.displayName || field.name)}"@${language} ;`);
      lines.push(`  rdfs:domain data:${classSlug} ;`);
      lines.push(`  rdfs:range ${field.type} ;`);

      if (field.searchable) {
        lines.push(`  :searchOrder ${searchOrder++} ;`);
      }

      if (field.showInResults) {
        lines.push(`  :headerOrder ${headerOrder++} ;`);
      }

      const shortenIn = field.shortenIn ?? [];
      if (shortenIn.length > 0) {
        lines.push(`  :shorten ${shortenIn.join(", ")} ;`);
      }

      const positions = field.documentPositions ?? [];
      if (positions.length > 0) {
        const posEntries = positions
          .map((p, i) => `${DOC_POSITION_KEY[p]} ${i + 1}`)
          .join(" ; ");
        lines.push(`  :documentPosition [ ${posEntries} ] ;`);
      }

      // Remove trailing " ;" from last property line and close with " ."
      const lastIdx = lines.length - 1;
      lines[lastIdx] = lines[lastIdx].replace(/ ;$/, " .");

      lines.push("");
    }
  }

  // ---------- instance data ----------

  lines.push("# Instance data");
  lines.push("");

  for (const doctypeEntry of doctypes) {
    const doctypeName = doctypeEntry.name;
    const fields = doctypeEntry.fields;
    const classSlug = toSlug(doctypeName);
    const mainDocType = doctypeEntry.mainDocumentType ?? "pdf";
    const mainDocPropSlug = classSlug + "Document";

    for (const doc of doctypeEntry.documents) {
      const instanceSlug = `${classSlug}_${fileSlug(doc.filename)}`;

      const triples: string[] = [`  a data:${classSlug}`];

      // Main document triple
      if (mainDocType === "pdf") {
        const pdfPath = `${doctypeName}/${doc.filename}`;
        triples.push(`  data:${mainDocPropSlug} "${escapeTtl(pdfPath)}"`);
      } else {
        // HTML and image: content stored in mainDocumentContent.
        // For images without uploaded content (CSV-only import), derive the img tag from the filename.
        let content = doc.mainDocumentContent ?? "";
        if (!content && mainDocType === "image") {
          content = `<img src="resources/docs/${doc.filename}" style="width:100%;aspect-ratio:auto" />`;
        }
        triples.push(`  data:${mainDocPropSlug} "${escapeTtl(content)}"`);
      }

      for (const field of fields) {
        const propSlug = classSlug + toSlug(field.name).replace(/^./, (c) => c.toUpperCase());

        const value = doc.values[field.name];
        if (value !== undefined && value !== "") {
          if (field.type === ":number") {
            if (/^-?\d+$/.test(value)) {
              triples.push(`  data:${propSlug} "${value}"^^xsd:integer`);
            } else {
              triples.push(`  data:${propSlug} "${escapeTtl(value)}"^^xsd:decimal`);
            }
          } else if (field.type === ":boolean") {
            triples.push(`  data:${propSlug} "${value === "true" ? "true" : "false"}"`);
          } else {
            triples.push(`  data:${propSlug} "${escapeTtl(value)}"`);
          }
        }
      }

      lines.push(`data:${instanceSlug}`);
      for (let i = 0; i < triples.length; i++) {
        lines.push(triples[i] + (i < triples.length - 1 ? " ;" : " ."));
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
