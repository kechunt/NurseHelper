import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  LOCALE_ID,
  ElementRef,
  Inject,
  ChangeDetectorRef,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import type { PatientClinicalNoteDto } from '../../../services/nurse.service';
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
import { buildEffectiveClinicalNotes } from '../../../shared/utils/clinical-notes-display.helpers';
import { nurseUiEmDash } from '../nurse-dashboard-ui-i18n.helpers';

@Component({
  selector: 'app-nurse-clinical-notes-scope-block',
  standalone: true,
  imports: [CommonModule, BootstrapIconComponent],
  templateUrl: './nurse-clinical-notes-scope-block.component.html',
  styleUrls: [
    '../nurse-neomorphic-modal.shared.css',
    './nurse-clinical-notes-scope-block.component.css',
  ],
})
export class NurseClinicalNotesScopeBlockComponent implements OnChanges, OnDestroy {
  private readonly localeId = inject(LOCALE_ID);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

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
  @Input() emptyLabel = '';

  /** Oculta el botón interno «Ver todas»; el padre maneja expand (p. ej. mis camas). */
  @Input() externalExpand = false;
  @Output() readonly expandRequest = new EventEmitter<void>();

  listModalOpen = false;
  detailNote: PatientClinicalNoteDto | null = null;
  private listOverlay: { element: HTMLElement; placeholder: Comment } | null = null;
  private detailOverlay: { element: HTMLElement; placeholder: Comment } | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId']) {
      this.dismissOverlays();
    }
  }

  dismissOverlays(): void {
    this.restoreOverlay('detail');
    this.restoreOverlay('list');
    this.listModalOpen = false;
    this.detailNote = null;
  }

  ngOnDestroy(): void {
    this.dismissOverlays();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (this.detailNote) {
      event.preventDefault();
      this.closeDetail();
    } else if (this.listModalOpen) {
      event.preventDefault();
      this.closeList();
    }
  }

  effectiveNotes(): PatientClinicalNoteDto[] {
    return buildEffectiveClinicalNotes(this.notesFromApi, this.legacySingleFieldText);
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
    this.cdr.detectChanges();
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
    this.listModalOpen = true;
    this.cdr.detectChanges();
    queueMicrotask(() => this.teleportOverlay('.ncnsb-notes-list-backdrop', 'list'));
  }

  onExpandClick(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.externalExpand) {
      this.expandRequest.emit();
      return;
    }
    this.openList();
  }

  private teleportOverlay(selector: string, kind: 'list' | 'detail'): void {
    const overlay = this.host.nativeElement.querySelector(selector) as HTMLElement | null;
    if (overlay?.parentElement && overlay.parentElement !== this.document.body) {
      const placeholder = this.document.createComment(`ncnsb-${kind}-overlay`);
      overlay.parentElement.insertBefore(placeholder, overlay);
      this.document.body.appendChild(overlay);
      const reference = { element: overlay, placeholder };
      if (kind === 'list') this.listOverlay = reference;
      else this.detailOverlay = reference;
    }
  }

  private restoreOverlay(kind: 'list' | 'detail'): void {
    const reference = kind === 'list' ? this.listOverlay : this.detailOverlay;
    if (!reference) return;
    if (reference.placeholder.parentNode) {
      reference.placeholder.parentNode.replaceChild(reference.element, reference.placeholder);
    } else {
      reference.element.remove();
    }
    if (kind === 'list') this.listOverlay = null;
    else this.detailOverlay = null;
  }

  closeList(): void {
    if (this.detailNote) this.closeDetail();
    this.restoreOverlay('list');
    this.listModalOpen = false;
    this.cdr.detectChanges();
  }

  openDetail(note: PatientClinicalNoteDto): void {
    this.detailNote = note;
    this.cdr.detectChanges();
    queueMicrotask(() => this.teleportOverlay('.ncnsb-notes-detail-backdrop', 'detail'));
  }

  closeDetail(): void {
    this.restoreOverlay('detail');
    this.detailNote = null;
    this.cdr.detectChanges();
  }

  expandAllLabel(count: number): string {
    return $localize`:@@ncnsb.expandAll:Ver todas (${count})`;
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
