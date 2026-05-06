import type { TaskItem } from '../../services/nurse.service';
import { pendingTaskDescriptionPreview } from './nurse-pending-task-description.helpers';

describe('pendingTaskDescriptionPreview', () => {
  it('devuelve em dash sin descripción o solo espacios', () => {
    expect(pendingTaskDescriptionPreview({} as TaskItem)).toBe('—');
    expect(pendingTaskDescriptionPreview({ description: '   ' } as TaskItem)).toBe('—');
  });

  it('devuelve texto completo si no supera 72 caracteres', () => {
    const s = 'a'.repeat(72);
    expect(pendingTaskDescriptionPreview({ description: s } as TaskItem)).toBe(s);
  });

  it('trunca a 69 caracteres más elipsis si supera 72', () => {
    const s = 'b'.repeat(80);
    const out = pendingTaskDescriptionPreview({ description: s } as TaskItem);
    expect(out.length).toBe(70);
    expect(out.endsWith('…')).toBe(true);
    expect(out.startsWith('b'.repeat(69))).toBe(true);
  });
});
