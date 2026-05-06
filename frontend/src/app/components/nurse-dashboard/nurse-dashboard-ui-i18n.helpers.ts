/** Cadenas compartidas para UI (guiones cortos / días) vía `$localize`. */

export function nurseUiEmDash(): string {
  return $localize`:@@nurseDashboard.ui.emDash:—`;
}

/** Abreviaturas Lun–Dom (primer día lunes). */
export function nurseWeekdayShortLabelsMondayFirst(): readonly string[] {
  return [
    $localize`:@@nurseWeekday.short.Mon:Lun`,
    $localize`:@@nurseWeekday.short.Tue:Mar`,
    $localize`:@@nurseWeekday.short.Wed:Mié`,
    $localize`:@@nurseWeekday.short.Thu:Jue`,
    $localize`:@@nurseWeekday.short.Fri:Vie`,
    $localize`:@@nurseWeekday.short.Sat:Sáb`,
    $localize`:@@nurseWeekday.short.Sun:Dom`,
  ];
}

const WEEKDAY_SELECT_VALUES_MON_FIRST = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type NurseWeekdaySelectValue = (typeof WEEKDAY_SELECT_VALUES_MON_FIRST)[number];

export function nurseWeekdaySelectOptionsMondayFirst(): {
  label: string;
  value: NurseWeekdaySelectValue;
}[] {
  const labels = nurseWeekdayShortLabelsMondayFirst();
  return WEEKDAY_SELECT_VALUES_MON_FIRST.map((value, i) => ({ label: labels[i]!, value }));
}
