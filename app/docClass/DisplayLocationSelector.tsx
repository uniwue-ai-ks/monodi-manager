import { type ReactNode, useState } from "react";
import { HiDownload } from "react-icons/hi";
import type { DocumentPosition } from "~/state";

const Explanation = ({ position }: { position?: DocumentPosition }) => {
  switch (position) {
    case ":main": return <p><strong>Hauptbereich</strong><br/>Feldinhalte werden hier untereinander gezeigt</p>
    case ":header": return <p><strong>Kopfzeilen</strong><br/>Felder werden hier nebeneinander gezeigt, PDFs nur als Link</p>
    case ":right": return <p><strong>Seitenleiste</strong><br/>Felder werden hier jeweils mit dem Feldnamen untereinander gezeigt, PDFs nur als Link</p>
    case ":download": return <p><strong>Downloadbereich</strong><br/>Hier können Dateien als Downloadbutton angezeigt werden</p>
    case undefined: return <></>
  }
}

export type DisplayLocationSelectorProps = {
  value?: DocumentPosition[],
  onChange: (value: DocumentPosition[]) => void
  downloadable?: boolean
}

export const DisplayLocationSelector = (props: DisplayLocationSelectorProps): ReactNode => {
  const [selected, setSelected] = useState<Set<DocumentPosition>>(new Set(props.value ?? []));
  const [hovered, setHovered] = useState<DocumentPosition | undefined>(undefined);

  const onSelect = (pos: DocumentPosition) => {
    const next = new Set(selected);
    if (next.has(pos)) {
      next.delete(pos);
    } else {
      next.add(pos);
    }
    props.onChange([...next]);
    setSelected(next);
  };

  const offColor = "fill-gray-200 group-hover:fill-blue-400 transition-colors";
  const onColor = "fill-blue-500 group-hover:fill-blue-700 transition-colors";

  const fill = (pos: DocumentPosition) => selected.has(pos) ? onColor : offColor;

  return <div className="grid grid-cols-[auto_auto] gap-3">
    <svg width="184px" height="112px" viewBox="0 0 46 28" onMouseLeave={() => setHovered(undefined)}>
      <g className="group cursor-pointer" onMouseEnter={() => setHovered(":header")}>
        <rect className={`${fill(":header")} stroke-white stroke-1`}
          width="44" height="5" x="1" y="1"
          onClick={() => onSelect(":header")} />
      </g>
      <g className="group cursor-pointer" onMouseEnter={() => setHovered(":right")}>
        <rect className={`${fill(":right")} stroke-white stroke-1`}
          onClick={() => onSelect(":right")}
          width="12" height={props.downloadable ? "12" : "19"} x="33" y="6" />
      </g>
      {props.downloadable ?
        <g className="group cursor-pointer" onMouseEnter={() => setHovered(":download")}>
          <rect className={`${fill(":download")} stroke-white stroke-1`}
            onClick={() => onSelect(":download")}
            width="12" height="7" x="33" y="18" />
          <foreignObject x="33" y="17" width="12" height="7" pointerEvents="none">
            <div className="flex items-center justify-center w-full h-full text-white">
              <HiDownload size={6} />
            </div>
          </foreignObject>
        </g>
        : undefined
      }
      <g className="group cursor-pointer" onClick={() => onSelect(":main")} onMouseEnter={() => setHovered(":main")}>
        <rect id="button"
          className={`${fill(":main")} stroke-white stroke-1`}
          width="32" height="19" x="1" y="6" />
        {/* white text lines */}
        <rect className="fill-white" width="26" height="1" x="4" y="9" />
        <rect className="fill-white" width="23" height="1" x="4" y="11" />
        <rect className="fill-white" width="24" height="1" x="4" y="13" />
        <rect className="fill-white" width="23" height="1" x="4" y="15" />
        <rect className="fill-white" width="26" height="1" x="4" y="17" />
        <rect className="fill-white" width="25" height="1" x="4" y="19" />
      </g>
    </svg>
    <Explanation position={hovered}/>
  </div>;
};

