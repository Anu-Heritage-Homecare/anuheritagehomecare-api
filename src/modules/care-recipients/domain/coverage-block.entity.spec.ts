import { CoverageBlock } from './coverage-block.entity';
import { CoverageSlot } from './coverage-slot.enum';
import { Weekday } from './weekday.enum';

describe('CoverageBlock', () => {
  it('creates an assigned block', () => {
    const block = CoverageBlock.create({
      id: 'b1',
      careRecipientId: 'r1',
      weekday: Weekday.Monday,
      slot: CoverageSlot.Morning,
      caregiverId: 'cg1',
    });
    expect(block.weekday).toBe(Weekday.Monday);
    expect(block.slot).toBe(CoverageSlot.Morning);
    expect(block.caregiverId).toBe('cg1');
    expect(block.isAssigned).toBe(true);
  });

  it('creates an open (unassigned) block', () => {
    const block = CoverageBlock.create({
      id: 'b1',
      careRecipientId: 'r1',
      weekday: Weekday.Sunday,
      slot: CoverageSlot.Afternoon,
      caregiverId: null,
    });
    expect(block.caregiverId).toBeNull();
    expect(block.isAssigned).toBe(false);
  });
});
