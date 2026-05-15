import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  LOCALE_ID,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PatientClinicalNoteDto } from '../../../services/nurse.service';
import { splitObservationLines } from '../nurse-patient-observations.helpers';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import {
  clinicalNoteDisplayBody,
  clinicalNotesPreviewSlice,
  loadClinicalPins,
  type ClinicalNotesPinScope,
  sortClinicalNotesNewestFirst,
  stableKeyForClinicalNote,
  toggleClinicalPin,
} from '../nurse-clinical-notes-pin.helpers';
import { nurseUiEmDash } from '../nurse-dashboard-ui-i18n.helpers';

@Component({
  selector: 'app-nurse-clinical-notes-scope-block',
  standalone: true,
  imports: [CommonModule, BootstrapIconComponent],
  templateUrl: './nurse-clinical-notes-scope-block.component.html',
  styleUrls: ['./nurse-clinical-notes-scope-block.component.css'],
})
export class NurseClinicalNotesScopeBlockComponent implements OnChanges {
  private readonly localeId = inject(LOCALE_ID);

  readonly ncnsbEmptyDefault = $localize`:@@ncnsb.emptyDefault:Sin datos`;
  readonly ncnsbPreviewAria = $localize`:@@ncnsb.previewAria:Vista previa de notas`;
  readonly ncnsbListTitleFallback = $localize`:@@ncnsb.listTitleFallback:Todas las notas`;
  readonly ncnsbListHint = $localize`:@@ncnsb.listHint:Pulse el texto para ver fecha y hora. Solo aquí: elige qué notas se muestran fuera (en este recuadro, pacientes y camas); entre 0 y 3.`;
  readonly ncnsbPinTitle = $localize`:@@ncnsb.pinTitle:Mostrar u ocultar en vistas compactas (máx. 3)`;
  readonly ncnsbPinAria = $localize`:@@ncnsb.pinAria:Mostrar u ocultar nota destacada`;
  readonly ncnsbAuthorLegacy = $localize`:@@ncnsb.authorLegacy:No registrada (nota anterior o texto libre)`;
  readonly ncnsbAuthorMissing = $localize`:@@ncnsb.authorMissing:No registrada`;
  readonly ncnsbCloseAria = $localize`:@@ncnsb.closeAria:Cerrar`;

  /** Paciente (string id del modelo `Patient` del dashboard). */
  @Input({ required: true }) patientId!: string;
  @Input({ required: true }) scope!: ClinicalNotesPinScope;

  @Input() notesFromApi: PatientClinicalNoteDto[] = [];
  /** Si no hay notas API, se parte este texto por líneas (comportamiento anterior). */
  @Input() legacySingleFieldText = '';

  /** Subtítulo opcional (camas / tabla compacta). */
  @Input() blockLabel = '';
  @Input() compact = false;
  /** Celda de tabla del panel enfermería: texto denso, sin cajas neumórficas en la vista previa. */
  @Input() tableCell = false;
  @Input() emptyLabel = '';

  listModalOpen = false;
  detailNote: PatientClinicalNoteDto | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId']) {
      this.dismissOverlays();
    }
  }

  dismissOverlays(): void {
    this.listModalOpen = false;
    this.detailNote = null;
  }

  effectiveNotes(): PatientClinicalNoteDto[] {
    if (this.notesFromApi?.length > 0) {
      return this.notesFromApi;
    }
    return splitObservationLines(this.legacySingleFieldText).map((line) => ({
      id: null,
      body: line.trim(),
      authorName: null,
      createdAt: null,
      legacy: true,
    }));
  }

  pinnedKeys(): string[] {
    return loadClinicalPins(this.patientId, this.scope);
  }

  previewNotes(): PatientClinicalNoteDto[] {
    const notes = this.effectiveNotes();
    return clinicalNotesPreviewSlice(notes, this.pinnedKeys(), this.scope);
  }

  listNotesSorted(): PatientClinicalNoteDto[] {
    return sortClinicalNotesNewestFirst(this.effectiveNotes());
  }

  displayBody(note: PatientClinicalNoteDto): string {
    return clinicalNoteDisplayBody(note.body);
  }

  noteKey(note: PatientClinicalNoteDto): string {
    return stableKeyForClinicalNote(note, this.scope);
  }

  isPinned(note: PatientClinicalNoteDto): boolean {
    return this.pinnedKeys().includes(this.noteKey(note));
  }

  onTogglePin(event: MouseEvent, note: PatientClinicalNoteDto): void {
    event.stopPropagation();
    toggleClinicalPin(this.patientId, this.scope, this.noteKey(note));
  }

  onPreviewStripClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.ncnsb__preview-line-main')) {
      return;
    }
    if (this.effectiveNotes().length === 0) {
      return;
    }
    this.openList();
  }

  openList(): void {
    if (this.effectiveNotes().length === 0) {
      return;
    }
    this.listModalOpen = true;
  }

  closeList(): void {
    this.listModalOpen = false;
  }

  openDetail(note: PatientClinicalNoteDto): void {
    this.detailNote = note;
  }

  closeDetail(): void {
    this.detailNote = null;
  }

  expandAllLabel(count: number): string {
    return $localize`:@@ncnsb.expandAll:Ver todas (${count}):n:)`;
  }

  detailAuthorLabel(note: PatientClinicalNoteDto): string {
    if (note.authorName?.trim()) {
      return note.authorName.trim();
    }
    return note.legacy ? this.ncnsbAuthorLegacy : this.ncnsbAuthorMissing;
  }

  detailDateLabel(note: PatientClinicalNoteDto): string {
    if (!note.createdAt) {
      return nurseUiEmDash();
    }
    const d = new Date(note.createdAt);
    return d.toLocaleDateString(this.localeId, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  detailTimeLabel(note: PatientClinicalNoteDto): string {
    if (!note.createdAt) {
      return nurseUiEmDash();
    }
    return new Date(note.createdAt).toLocaleTimeString(this.localeId, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
