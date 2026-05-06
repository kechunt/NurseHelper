/** Grupo de tareas por hora (misma forma que `getTodayTasks` en el panel). */
export type NurseTasksFilterHourGroup = {
  hour?: string;
  tasks?: NurseTasksFilterTask[];
};

/** Fila de tarea con los campos usados por filtros de hora / paciente. */
export type NurseTasksFilterTask = {
  scheduledTime?: string;
  hour?: string;
  patientName?: string;
  [key: string]: unknown;
};

type TaskWithGroupMeta = NurseTasksFilterTask & { _groupHour?: string };

export interface ComputeFilteredNurseTasksGroupedInput {
  groups: NurseTasksFilterHourGroup[] | null | undefined;
  tasksHourFilter: string;
  tasksPatientFilter: string;
  patients: Array<{ id: string; name: string }> | null | undefined;
  now: Date;
}

function flattenGroups(gs: NurseTasksFilterHourGroup[]): TaskWithGroupMeta[] {
  const out: TaskWithGroupMeta[] = [];
  for (const g of gs) {
    for (const t of g.tasks || []) {
      out.push({ ...t, _groupHour: g.hour });
    }
  }
  return out;
}

function regroupByHour(flat: TaskWithGroupMeta[]): NurseTasksFilterHourGroup[] {
  const acc: Record<string, NurseTasksFilterTask[]> = {};
  for (const t of flat) {
    const d = t.scheduledTime ? new Date(t.scheduledTime) : null;
    const hourKey =
      d && !isNaN(d.getTime()) ? `${d.getHours()}:00` : String(t._groupHour || t.hour || '0:00');
    if (!acc[hourKey]) {
      acc[hourKey] = [];
    }
    const { _groupHour, ...rest } = t;
    acc[hourKey].push(rest);
  }
  return Object.entries(acc)
    .sort((a, b) => parseInt(String(a[0]).split(':')[0], 10) - parseInt(String(b[0]).split(':')[0], 10))
    .map(([hour, tasks]) => ({
      hour,
      tasks: tasks.sort(
        (a, b) =>
          new Date(a.scheduledTime || 0).getTime() - new Date(b.scheduledTime || 0).getTime()
      ),
    }));
}

/**
 * Aplica los mismos filtros que el dashboard (`tasksHourFilter`, paciente seleccionado)
 * sobre los grupos por hora, sin mutar el array de entrada de primer nivel.
 */
export function computeFilteredNurseTasksGroupedByHour(
  input: ComputeFilteredNurseTasksGroupedInput
): NurseTasksFilterHourGroup[] {
  const { tasksHourFilter, tasksPatientFilter, patients, now } = input;
  const currentHour = now.getHours();
  const groups = [...(input.groups || [])];

  let filteredTasks: NurseTasksFilterHourGroup[] = groups;

  if (tasksHourFilter !== 'all') {
    const flat = flattenGroups(groups);
    let nextFlat: TaskWithGroupMeta[] = flat;
    const t0 = now.getTime();

    if (tasksHourFilter === 'next1h') {
      const t1 = t0 + 60 * 60 * 1000;
      nextFlat = flat.filter((task) => {
        if (task.scheduledTime) {
          const ts = new Date(task.scheduledTime).getTime();
          if (!isNaN(ts)) {
            return ts >= t0 && ts <= t1;
          }
        }
        return false;
      });
    } else if (tasksHourFilter === 'current') {
      const t1 = t0 + 3 * 60 * 60 * 1000;
      nextFlat = flat.filter((task) => {
        if (task.scheduledTime) {
          const ts = new Date(task.scheduledTime).getTime();
          if (!isNaN(ts)) {
            return ts >= t0 && ts <= t1;
          }
        }
        const h = parseInt(String(task._groupHour || task.hour || '0').split(':')[0], 10);
        return !isNaN(h) && h >= currentHour;
      });
    } else {
      nextFlat = flat.filter((task) => {
        const h = task.scheduledTime
          ? new Date(task.scheduledTime).getHours()
          : parseInt(String(task._groupHour || task.hour || '0').split(':')[0], 10);
        if (isNaN(h)) {
          return false;
        }
        if (tasksHourFilter === 'morning') {
          return h >= 6 && h < 12;
        }
        if (tasksHourFilter === 'afternoon') {
          return h >= 12 && h < 18;
        }
        if (tasksHourFilter === 'evening') {
          return h >= 18 && h < 24;
        }
        if (tasksHourFilter === 'night') {
          return h >= 0 && h < 6;
        }
        return true;
      });
    }

    filteredTasks = regroupByHour(nextFlat);
  }

  if (tasksPatientFilter) {
    const selectedPatient = (patients || []).find((p) => p.id === tasksPatientFilter);
    const patientName = selectedPatient?.name;

    if (patientName) {
      filteredTasks = filteredTasks
        .map((group) => ({
          ...group,
          tasks: (group.tasks || []).filter((task) => task.patientName === patientName),
        }))
        .filter((group) => (group.tasks || []).length > 0);
    }
  }

  return filteredTasks;
}
