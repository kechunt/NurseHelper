import { buildEffectiveClinicalNotes } from './clinical-notes-display.helpers';

describe('clinical-notes-display.helpers', () => {
  it('buildEffectiveClinicalNotes usa API y quita prefijos de fecha', () => {
    const notes = buildEffectiveClinicalNotes(
      [{ id: 1, body: '[5/5/2026 21:36:00] nota', authorName: null, createdAt: null, legacy: false }],
      ''
    );
    expect(notes[0].body).toBe('nota');
  });

  it('buildEffectiveClinicalNotes parte legacy por líneas', () => {
    const notes = buildEffectiveClinicalNotes(undefined, '[1/1/2026] A\nB');
    expect(notes.length).toBe(2);
    expect(notes[0].body).toBe('A');
    expect(notes[1].body).toBe('B');
  });
});
