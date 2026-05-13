import type { AppState } from "~/utils/flowStorage";
import type { DoctypeField, DocumentPosition } from "~/state";

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

/** Map a DocumentPosition slug to the Turtle blank-node key. */
const DOC_POSITION_KEY: Record<DocumentPosition, string> = {
  ":main": ":main",
  ":header": ":header",
  ":right": ":right",
  ":download": ":download",
  ":sticky": ":sticky",
};

export function generateTtl(state: AppState): string {
  const doctypes = state.doctypes ?? {};
  const documents = state.documents ?? [];

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

  // ---------- schema ----------

  for (const [doctypeName, fields] of Object.entries(doctypes)) {
    const classSlug = toSlug(doctypeName);

    lines.push(`# Class: ${doctypeName}`);
    lines.push(`data:${classSlug}`);
    lines.push(`  a rdfs:Class ;`);
    lines.push(`  rdfs:label "${escapeTtl(doctypeName)}" ;`);
    lines.push(`  :shortUrlTag "${escapeTtl(classSlug)}" .`);
    lines.push("");

    let searchOrder = 1;
    let headerOrder = 1;

    for (const field of fields) {
      const propSlug = classSlug + toSlug(field.name).replace(/^./, (c) => c.toUpperCase());

      lines.push(`data:${propSlug}`);
      lines.push(`  a rdf:Property ;`);
      lines.push(`  rdfs:label "${escapeTtl(field.displayName || field.name)}" ;`);
      lines.push(`  rdfs:domain data:${classSlug} ;`);
      lines.push(`  rdfs:range ${field.type} ;`);

      if (field.searchable) {
        lines.push(`  :searchOrder ${searchOrder++} ;`);
      }

      if (field.showInResults) {
        lines.push(`  :headerOrder ${headerOrder++} ;`);
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

  for (const doc of documents) {
    const classSlug = toSlug(doc.doctype);
    const instanceSlug = `${classSlug}_${fileSlug(doc.filename)}`;
    const fields: DoctypeField[] = (doctypes[doc.doctype] ?? []);

    const triples: string[] = [`  a data:${classSlug}`];

    for (const field of fields) {
      const propSlug = classSlug + toSlug(field.name).replace(/^./, (c) => c.toUpperCase());

      if (field.type === ":pdf") {
        // PDF path as referenced by Monodi: <DoctypeName>/<filename>
        const pdfPath = `${doc.doctype}/${doc.filename}`;
        triples.push(`  data:${propSlug} "${escapeTtl(pdfPath)}"`);
      } else {
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
    }

    lines.push(`data:${instanceSlug}`);
    for (let i = 0; i < triples.length; i++) {
      lines.push(triples[i] + (i < triples.length - 1 ? " ;" : " ."));
    }
    lines.push("");
  }

  return lines.join("\n");
}
