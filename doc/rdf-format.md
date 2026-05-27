# Monodi RDF Schema Reference

This document describes all RDF triples the Monodi frontend reads from the Fuseki backend. The frontend uses two namespaces:

| Prefix  | URI                          | Purpose                               |
| ------- | ---------------------------- | ------------------------------------- |
| `:`     | `http://olyro.de/mondiview/` | Monodi vocabulary (schema predicates) |
| `data:` | `http://monodicum/`          | Instance data and class definitions   |

All SPARQL queries are sent as POST to the Fuseki endpoint with these prefixes prepended automatically.

---

## Top-Level Structure

The database contains two kinds of things:

1. **Schema** — `rdfs:Class` and `rdf:Property` resources that describe what entity types exist and what their attributes look like. The frontend reads this on startup to build its UI.
2. **Data** — Instances of those classes (the actual documents, pages, etc.).

---

## Defining Entity Classes

A class is any resource of type `rdfs:Class`. It represents a searchable/viewable entity type (e.g. "Book", "Page").

```turtle
data:book
  a rdfs:Class ;
  rdfs:label "Bücher"@de, "Books"@en ;
  :shortUrlTag "book" ;
  :disablePrintColumn true ;
  :openIIIFText "Faksimile"@de, "Faksimile"@en .
```

### Class-level predicates

| Predicate               | Range               | Description                                                                             |
| ----------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `rdfs:label`            | lang-tagged literal | Display name shown in navigation and search tabs. Must exist for every active language. |
| `:shortUrlTag`          | string literal      | Slug used for short URL routing (e.g. `/book/<id>`).                                    |
| `:disablePrintColumn`   | boolean             | If `true`, hides the print/queue checkbox column in search results.                     |
| `:openIIIFText`         | lang-tagged literal | Label for the button that opens the IIIF/image viewer. If absent, no button is shown.   |
| `:openPopupText`        | lang-tagged literal | Label for the button that opens a popup viewer.                                         |
| `:popupTitle`           | lang-tagged literal | Title shown in the popup header.                                                        |
| `:comparableInSynopsis` | boolean             | If `true`, instances of this class can be added to a multi-document synopsis view.      |
| `:alternativeLink`      | URI                 | Replaces the default document view link with this external URL.                         |
| `:orderBy`              | property URI        | Default sort attribute for the search results list.                                     |

### Sub-class (parent–child) relationship

A class can declare that each of its instances belongs to an instance of another ("parent") class:

```turtle
data:page
  a rdfs:Class ;
  :referenceClass     data:book ;        # the parent class
  :referenceAttribute data:pageBook ;    # the property that holds the parent URI
  :referenceLabel     "Browse pages"@en .
```

| Predicate             | Description                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `:referenceClass`     | URI of the parent class.                                                                                        |
| `:referenceAttribute` | URI of the property (on this class) whose value is the parent entity URI.                                       |
| `:referenceLabel`     | Link text shown in the parent's search results to navigate into this sub-class filtered by the selected parent. |

When `:referenceClass` / `:referenceAttribute` are set, all search queries are automatically scoped with a `?obj <referenceAttribute> ?ref` graph pattern, and `reference`-type attributes pull their values from the matched `?ref`.

---

## Defining Properties

Every displayable or searchable field is a `rdf:Property`:

```turtle
data:bookTitle
  a rdf:Property ;
  rdfs:label   "Titel"@de, "Title"@en ;
  rdfs:domain  data:book ;
  rdfs:range   :string ;
  :headerOrder 1 ;
  :searchOrder 1 ;
  :documentPosition [ :header 1 ; :synopsis 1 ] .
```

### Required predicates

| Predicate     | Description                                                         |
| ------------- | ------------------------------------------------------------------- |
| `rdfs:domain` | The class URI this property belongs to.                             |
| `rdfs:range`  | The attribute type (see [Attribute Types](#attribute-types) below). |
| `rdfs:label`  | Display label; must exist for every active language.                |

### Search / column control

| Predicate                   | Range        | Description                                                                                                        |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `:headerOrder`              | integer      | Makes this attribute a column in search results. Lower number = leftmost column.                                   |
| `:searchOrder`              | integer      | Makes this attribute a filter in the search bar. Lower number = shown first.                                       |
| `:searchSpan`               | boolean      | For `:number` attributes only: enables "min–max" range input (e.g. `1524-1600`).                                   |
| `:searchPreview`            | blank node   | Adds a "preview" column showing the surrounding context of the first match. See [Search Preview](#search-preview). |
| `:initialSearch`            | boolean      | If `true`, this attribute's filter is shown in the search bar by default without the user adding it.               |
| `:implicitQueryValue`       | string       | Automatically appended to every search query for this attribute unless the user provides their own value.          |
| `:uiQueryPrefillValue`      | string       | Pre-fills the filter input field when the user adds this attribute to the search bar.                              |
| `:hideInputFromSearch`      | boolean      | If `true`, the filter input field is hidden (the attribute can still be used as a filter programmatically).        |
| `:alternativeSortAttribute` | property URI | Use a different attribute's values for sorting this attribute's column.                                            |

### Cross-class search linking

```turtle
data:pageText
  :referenceSearch data:bookFulltext .
```

When the user searches a parent class by `data:bookFulltext` and navigates to the sub-class, `data:pageText` is pre-filled with the same search term.

---

## Attribute Types

The `rdfs:range` of a property determines how the frontend stores, displays, and searches it.

### `:string`
Plain text. Searched with case-insensitive regex. Optionally normalised before storage:

```turtle
data:someField
  rdfs:range :string ;
  :normalization [
    :attribute  data:someFieldNormalized ;  # target property URI
    :normalizer "value => value.toLowerCase().trim()"  # JavaScript expression (eval'd)
  ] .
```

### `:number`
Numeric value (`xsd:integer` or plain integer literal). Supports range search when `:searchSpan true`.

### `:htmlContent`
Raw HTML string. Rendered directly in the document view. Not filterable.

### `:pdf`
A PDF filename or relative URL (resolved against `VITE_PDF_URL`). Displayed with the built-in PDF viewer.

### `:entity`
A URI pointing to another entity. Rendered as a navigable link. Values are literal URI strings in the data:

```turtle
data:pageBook rdfs:range :entity .
# instance:
data:page001 data:pageBook data:camoc0006 .
```

### `:reference`
A **virtual** attribute. Does not store a value on the instance; instead it reads a field from the parent entity identified by `:referenceAttribute`. Requires `:referenceField`:

```turtle
data:pageRefBook
  rdfs:range     :reference ;
  :referenceField data:bookTitle .
```

The frontend looks up the parent via the class's `:referenceAttribute`, then retrieves the value of `:referenceField` from that parent.

### `:category`
An enumerated set of values. The allowed values are declared on the property:

```turtle
data:someStatus
  rdfs:range :category ;
  :hasPossibleValue [ :value "draft" ; rdfs:label "Draft"@en ] ;
  :hasPossibleValue [ :value "final" ; rdfs:label "Final"@en ;
    :guard [ :attribute data:otherProp ; :value "yes" ]  # only show when otherProp = "yes"
  ] ;
  :mapValues [ :value "draft" ; rdfs:label "In Bearbeitung"@de ] .  # display-only rename
```

| Predicate           | Description                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `:hasPossibleValue` | Blank node: `:value` (the stored string) + optional `rdfs:label` + optional `:guard`.                                                    |
| `:guard`            | Blank node: `:attribute` (property URI) + `:value` (string). The category option is only shown when that other attribute has that value. |
| `:mapValues`        | Blank node: `:value` + `rdfs:label`. Renames a value for display without changing what is stored.                                        |

### `:imageCollection`
A URI pointing to an **image collection resource**. The frontend fetches that resource's structure via SPARQL. See [Image Collection Structure](#image-collection-structure).

### `:htmlImageCollection`
A URI pointing to a mixed HTML/image collection resource. See [HTML Image Collection Structure](#html-image-collection-structure).

### `:substringSearchText`
Text stored without diacritics, spaces, or hyphens (the frontend normalises the query the same way). Used for search-only fields where exact-form matching is not desired.

### `:copyText`
A plain string rendered with a copy-to-clipboard button.

---

## Document Positions

Every property can specify where its value appears in the document view and search results via a `:documentPosition` blank node. Each position slot takes an integer order value (lower = higher priority within that slot):

```turtle
data:bookTitle
  :documentPosition [ :header 1 ; :synopsis 1 ] .
```

| Position key     | Where it appears                                                                   |
| ---------------- | ---------------------------------------------------------------------------------- |
| `:header`        | Column in search results table.                                                    |
| `:right`         | Right metadata panel in document view.                                             |
| `:main`          | Main content area of document view.                                                |
| `:priority`      | Top/featured slot (e.g. PDF/image viewer). Typically only one attribute per class. |
| `:sticky`        | Always-visible slot that stays when scrolling.                                     |
| `:popup`         | Shown inside a popup overlay.                                                      |
| `:synopsis`      | Column in the synopsis comparison view.                                            |
| `:synopsisId`    | Identifier slot in the synopsis view.                                              |
| `:download`      | Rendered as a download link (uses `:icon` if provided).                            |
| `:docNavigation` | Navigation widget (prev/next/page number).                                         |

A property with no `:documentPosition` (or no recognized slots) is invisible in the document view but can still be used for search.

### Truncation (`:shorten`)

To truncate a value's display in specific positions:

```turtle
data:someField :shorten :header, :right .
```

Valid values: `:header`, `:right`, `:main`, `:priority`, `:sticky`, `:popup`, `:synopsis`, `:synopsisId`, `:download`, `:navigation`, `:results`.

---

## Image Collection Structure

Used with `rdfs:range :imageCollection`. The collection URI must resolve in the graph:

```turtle
<some:collectionUri>
  :hasPage [
    :pageNr 1 ;
    :image "http://example.org/page1.jpg" ;           # optional direct URL
    rdfs:label "Page 1"@en ;                           # optional
    :hasResolutions [
      :resolution [ :url "page1-800.jpg" ; :res 800 ] ;
      :resolution [ :url "page1-1200.jpg" ; :res 1200 ]
    ] ;
    :hasMetadata [
      :metadataEntry [ :index 0 ; :label "Folio"@en ; :value "fol. 1r" ]
    ]
  ] .

data:hasPrintView "collection.pdf" .   # optional; attached to the collection URI
```

| Predicate           | Description                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `:hasPage`          | One blank node per page.                                                                             |
| `:pageNr`           | Integer page number.                                                                                 |
| `:hasResolutions`   | Blank node containing `:resolution` entries.                                                         |
| `:resolution`       | Blank node with `:url` (filename, resolved against `VITE_SVG_URL`) and `:res` (pixel width integer). |
| `:image`            | Direct image URL (used when no resolutions are needed).                                              |
| `rdfs:label`        | Display label for the page.                                                                          |
| `:hasMetadata`      | Blank node containing `:metadataEntry` entries.                                                      |
| `:metadataEntry`    | Blank node: `:index` (sort order), `:label` (lang-tagged), `:value` (string).                        |
| `data:hasPrintView` | PDF URL for the whole collection (shown as a print option).                                          |

---

## HTML Image Collection Structure

Used with `rdfs:range :htmlImageCollection`. The collection URI must resolve:

```turtle
<some:collectionUri>
  :hasMember [ :orderNumber 1 ; :fileName "image1.jpg" ] ;
  :hasMember [ :orderNumber 2 ; :html "<em>caption</em>" ] ;
  :hasMember [ :orderNumber 3 ; :blockStartClass "section-break" ] .
```

Each member blank node has `:orderNumber` (integer) and exactly one of:

| Predicate          | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `:fileName`        | Image filename, resolved against `VITE_SVG_URL`.      |
| `:html`            | Raw HTML string inserted inline.                      |
| `:blockStartClass` | CSS class name; rendered as a styled block separator. |

Members are sorted by `:orderNumber`; within the same order, `html` sorts after `fileName`.

---

## Search Preview

Adds a context-snippet column to search results for full-text fields:

```turtle
data:bookFulltext
  :searchPreview [
    :label "First match"@en, "Erster Treffer"@de ;
    :config [
      :contextKind  "lines" ;      # "words" | "lines"
      :contextCount 2 ;            # how many words/lines of context
      :maxDistanceRatio 0.3        # fuzzy match tolerance (0.0–1.0)
    ]
  ] .
```

---

## Conditional Button Text (`:conditionalOpenText`)

Displays a different "open" button label depending on an attribute value:

```turtle
data:myClass :conditionalOpenText [
  :defaultResult "Open"@en ;
  :property      data:someFlag ;     # check this attribute's value
  :check [ :value "A" ; :order 0 ; :result "Open as A"@en ] ;
  :check [ :value "B" ; :order 1 ; :result "Open as B"@en ]
] .
```

The `:result` and `:defaultResult` strings may be untagged or lang-tagged.

---

## Static Content Pages

Any URI can provide navigable HTML pages for the "project info" / "static pages" area:

```turtle
<some:page>
  :hasContent   "<h1>About</h1>..."@en ;
  :hasTitle     "About"@en ;
  :hasRoute     "about" ;
  :position     [ :left 1 ] .   # or :right, :footer
```

| Predicate     | Description                                                                               |
| ------------- | ----------------------------------------------------------------------------------------- |
| `:hasContent` | lang-tagged HTML string.                                                                  |
| `:hasTitle`   | lang-tagged display name (used in navigation).                                            |
| `:hasRoute`   | URL slug (relative to app root).                                                          |
| `:position`   | Blank node with `:left`, `:right`, or `:footer` (integer order) for navigation placement. |

---

## Global Configuration

### Version

```turtle
data:version a rdf:Property .
data:version rdfs:label "2024-03-05T14:00:37Z" .
```

An untagged literal on `data:version rdfs:label`. Changed whenever the schema is updated; the frontend uses this to invalidate its `localStorage` entity-description cache.

### Language detection

```turtle
:tabTitle :hasContent "Monodi"@de, "Monodi"@en, "Monodi"@fr .
```

The frontend queries `DISTINCT LANG(?label)` on `:tabTitle :hasContent` to determine which languages are available.

### UI string overrides

```turtle
:uiText :hasOverride [ :key "search.placeholder" ; :value "Suche…"@de ] .
```

Allows per-deployment overrides of hardcoded UI strings. The `:key` is an application-internal string key.

---

## Instance Data

Instance triples follow the property definitions:

```turtle
data:camoc0006
  a data:book ;
  data:bookTitle  "Demosthenis Olynthiaca prima (lat.)"@de ;
  data:bookYear   1524 ;
  data:bookPDF    "camoc0006.pdf" .

data:camoc0006_page001
  a data:page ;
  data:pageBook   data:camoc0006 ;    # entity reference to parent
  data:pageNumber 1 ;
  data:pagePDF    "camoc0006-001.pdf" ;
  data:pageNext   data:camoc0006_page002 ;
  data:pageText   "..." .
```

- String/HTML values may or may not be lang-tagged. The frontend accepts untagged literals or literals matching the active language.
- PDF and image filenames are bare strings resolved client-side against `VITE_PDF_URL` / `VITE_SVG_URL`.
- `:entity`-range properties store the target URI as the object (not a literal string).
