import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NursePatientObservationsTabComponent } from './nurse-patient-observations-tab.component';
import { NurseClinicalNotesScopeBlockComponent } from '../nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component';

function ensureLocalizeShim(): void {
  const g = globalThis as any;
  if (typeof g.$localize === 'function') {
    return;
  }
  g.$localize = (strings: TemplateStringsArray, ...expr: unknown[]) =>
    strings.reduce((acc, rawPart, idx) => {
      const part = idx === 0 ? rawPart.replace(/^:.*?:/, '') : rawPart;
      return acc + part + (idx < expr.length ? String(expr[idx]) : '');
    }, '');
}

describe('NursePatientObservationsTabComponent', () => {
  let fixture: ComponentFixture<NursePatientObservationsTabComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NursePatientObservationsTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePatientObservationsTabComponent);
    fixture.componentRef.setInput('patientId', 'patient-test-1');
    fixture.componentRef.setInput('diagnosis', 'Dx inicial');
    fixture.componentRef.setInput('medicalObservations', '');
    fixture.componentRef.setInput('allergies', '');
    fixture.componentRef.setInput('specialNeeds', '');
    fixture.componentRef.setInput('generalObservations', 'Línea 1\n\nLínea 2');
    fixture.componentRef.setInput('newDiagnosisNote', '');
    fixture.componentRef.setInput('newMedicalObservationNote', '');
    fixture.componentRef.setInput('newAllergiesNote', '');
    fixture.componentRef.setInput('newSpecialNeedsNote', '');
    fixture.componentRef.setInput('newGeneralObservationNote', '');
    fixture.componentRef.setInput('isSavingObservation', false);
    fixture.componentRef.setInput('clinicalNotesDiagnosis', []);
    fixture.componentRef.setInput('clinicalNotesMedical', []);
    fixture.componentRef.setInput('clinicalNotesAllergies', []);
    fixture.componentRef.setInput('clinicalNotesSpecialNeeds', []);
    fixture.componentRef.setInput('clinicalNotesGeneral', []);
    fixture.detectChanges();
  });

  it('renderiza un bloque de notas por cada ámbito clínico', () => {
    const blocks = fixture.nativeElement.querySelectorAll('app-nurse-clinical-notes-scope-block');
    expect(blocks.length).toBe(5);
  });

  it('pasa emptyLabel localizado a cada bloque clínico', () => {
    const blocks = fixture.debugElement.queryAll(By.directive(NurseClinicalNotesScopeBlockComponent));
    expect(blocks.length).toBe(5);
    const cmp = fixture.componentInstance;
    const labels = blocks.map((el) => el.injector.get(NurseClinicalNotesScopeBlockComponent).emptyLabel);
    expect(labels).toEqual([
      cmp.emptyLabelDiagnosis,
      cmp.emptyLabelMedical,
      cmp.emptyLabelAllergies,
      cmp.emptyLabelSpecial,
      cmp.emptyLabelGeneral,
    ]);
  });

  it('resetObservationEditState limpia modo edición', () => {
    fixture.componentInstance.startEditingDiagnosis();
    expect(fixture.componentInstance.editingDiagnosis).toBeTrue();
    fixture.componentInstance.resetObservationEditState();
    expect(fixture.componentInstance.editingDiagnosis).toBeFalse();
    expect(fixture.componentInstance.editedDiagnosis).toBe('');
  });

  it('flujo editar diagnóstico emite saveDiagnosis con texto recortado', () => {
    let payload = '';
    const sub = fixture.componentInstance.saveDiagnosis.subscribe((v) => {
      payload = v;
    });
    fixture.componentInstance.startEditingDiagnosis();
    fixture.detectChanges();
    fixture.componentInstance.editedDiagnosis = '  Nuevo dx  ';
    fixture.componentInstance.emitSaveDiagnosis();
    expect(payload).toBe('Nuevo dx');
    sub.unsubscribe();
  });

  it('emitClinicalAppend emite saveClinicalAppend', () => {
    const scopes: string[] = [];
    const sub = fixture.componentInstance.saveClinicalAppend.subscribe((s) => scopes.push(s));
    fixture.componentInstance.emitClinicalAppend('general');
    expect(scopes).toEqual(['general']);
    sub.unsubscribe();
  });
});
