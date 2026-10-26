import { emptyLocation, type DTR, type Location, type Part } from "../lib/contracts";

// Demonstration inventory only. These identifiers, fitments and links are not live railway records.
const definitions = [
  ["TDU", "Traction drive assembly"],
  ["TRC", "Traction converter"],
  ["TMO", "Traction motor"],
  ["IGB", "IGBT power module"],
  ["BCU", "Brake control unit"],
  ["DCU", "Door control unit"],
  ["AUX", "Auxiliary power converter"],
  ["HVA", "HVAC controller"],
] as const;

function placement(values: Partial<Location>): Location {
  return { ...emptyLocation(), ...values };
}

export function mockSeed(): { dtrs: DTR[]; parts: Part[] } {
  const dtrs: DTR[] = definitions.map(([code, name]) => ({
    dtrNo: `DTR-${code}-100`,
    name,
    plmLink: `https://example.com/mock/plm/DTR-${code}-100`,
    orchestraLink: `https://example.com/mock/orchestra/DTR-${code}-100`,
  }));
  const assemblyPlacements = [
    placement({ trainType: "X'Trapolis 100", amc: "920M", ao: "A-end traction bay" }),
    placement({ trainType: "Comeng", amc: "486M", ao: "No. 1 equipment bay" }),
    placement({ trainType: "Siemens Nexas", amc: "801M", ao: "Underframe bay 2" }),
    placement({ trainType: "X'Trapolis 100", altona: "Workshop · rack A-04", localStorage: "Traction spares" }),
  ];
  const assemblyDates = ["2026-10-02", "2026-10-05", "2026-10-08", null];
  const parts: Part[] = [];
  for (const [index, [code]] of definitions.entries()) {
    for (let unit = 0; unit < 4; unit += 1) {
      const suffix = String(unit + 1).padStart(3, "0");
      let location: Location;
      let dateInstalled: string | null;
      if (index < 4) {
        location = { ...assemblyPlacements[unit] };
        dateInstalled = assemblyDates[unit];
      } else {
        const variants = [
          placement({ trainType: "X'Trapolis 100", amc: `${920 + index}M`, ao: `${code} cabinet` }),
          placement({ trainType: "Comeng", vbn: `Bayswater · shelf ${index}-B`, localStorage: "Ready for issue" }),
          placement({ trainType: "Siemens Nexas", crl: `Craigieburn · bin ${index}-03` }),
          placement({ trainType: unit % 2 === 0 ? "Comeng" : "Siemens Nexas", other: `Vendor repair · job MOCK-${index}42`, altona: index === 4 ? "Incoming inspection" : "" }),
        ];
        location = variants[unit];
        dateInstalled = unit === 0 ? `2026-10-${String(index + 6).padStart(2, "0")}` : null;
      }
      parts.push({
        id: `part-${code.toLowerCase()}-${suffix}`,
        version: 1,
        serialNumber: `${code}-2024-${suffix}`,
        name: dtrs[index].name,
        dtrNo: dtrs[index].dtrNo,
        location,
        revision: ["C", "B", "D", "C"][unit],
        datecode: 202420 + index * 2 + unit,
        dateInstalled,
        operator: "Mock inventory import",
        subParts: code === "TDU"
          ? { converter: `part-trc-${suffix}`, motor: `part-tmo-${suffix}` }
          : code === "TRC"
            ? { powerModule: `part-igb-${suffix}` }
            : {},
      });
    }
  }
  return { dtrs, parts };
}
