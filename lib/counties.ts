// lib/counties.ts
// All 15 counties of Liberia with their capitals

export const COUNTIES = [
  { id: "bomi", name: "Bomi", capital: "Tubmanburg" },
  { id: "bong", name: "Bong", capital: "Gbarnga" },
  { id: "gbarpolu", name: "Gbarpolu", capital: "Bopolu" },
  { id: "grand_bassa", name: "Grand Bassa", capital: "Buchanan" },
  { id: "grand_cape_mount", name: "Grand Cape Mount", capital: "Robertsport" },
  { id: "grand_gedeh", name: "Grand Gedeh", capital: "Zwedru" },
  { id: "grand_kru", name: "Grand Kru", capital: "Barclayville" },
  { id: "lofa", name: "Lofa", capital: "Voinjama" },
  { id: "margibi", name: "Margibi", capital: "Kakata" },
  { id: "maryland", name: "Maryland", capital: "Harper" },
  { id: "montserrado", name: "Montserrado", capital: "Monrovia" },
  { id: "nimba", name: "Nimba", capital: "Sanniquellie" },
  { id: "river_cess", name: "River Cess", capital: "Cestos City" },
  { id: "river_gee", name: "River Gee", capital: "Fish Town" },
  { id: "sinoe", name: "Sinoe", capital: "Greenville" },
] as const;

export type CountyId = (typeof COUNTIES)[number]["id"];

export function getCountyById(id: string) {
  return COUNTIES.find((c) => c.id === id);
}

export function getCountyName(id: string) {
  return COUNTIES.find((c) => c.id === id)?.name ?? id;
}
