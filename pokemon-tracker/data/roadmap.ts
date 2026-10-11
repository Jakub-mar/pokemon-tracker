export type RoadmapStep = {
  id: string;
  label: string;
  children?: Array<{
    id: string;
    label: string;
  }>;
};

export const roadmapSteps: RoadmapStep[] = [
  { id: '1', label: 'Návrh databáze' },
  {
    id: '2',
    label: 'Vytvoření databázových tabulek',
    children: [
      { id: '2.1', label: 'Tabulka pro karty a boxy' },
      { id: '2.2', label: 'Tabulka pro uživatele a portfolia' },
      { id: '2.3', label: 'Tabulka pro tržní ceny (včetně PSA)' },
    ],
  },
  { id: '3', label: 'Přihlašovací stránka a správa uživatelů' },
];
