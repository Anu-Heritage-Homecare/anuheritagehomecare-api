import {
  CatalogServiceRef,
  RenderedVisit,
  deriveRenderedQuantities,
  visitBillableMinutes,
} from './rendered-services.calculator';

function visit(overrides: Partial<RenderedVisit> = {}): RenderedVisit {
  return {
    visitType: 'PERSONAL_CARE',
    clockInAt: null,
    clockOutAt: null,
    startMinute: 540,
    endMinute: 600,
    breakMinutes: 0,
    ...overrides,
  };
}

const CATALOG: CatalogServiceRef[] = [
  { code: 'PERSONAL_CARE_SUPPORT', unit: 'HOURLY' },
  { code: 'MEDICATION_MANAGEMENT', unit: 'HOURLY' },
  { code: 'PHYSIOTHERAPY_SESSIONS', unit: 'SESSION' },
  { code: 'NUTRITIONAL_MEAL_PREP', unit: 'HOURLY' },
  { code: 'ADMIN_CARE_COORDINATION', unit: 'FIXED' },
];

describe('visitBillableMinutes', () => {
  it('uses clocked time net of breaks when the visit was clocked', () => {
    const minutes = visitBillableMinutes(
      visit({
        clockInAt: new Date('2026-07-01T09:00:00.000Z'),
        clockOutAt: new Date('2026-07-01T12:00:00.000Z'),
        breakMinutes: 30,
      }),
    );
    expect(minutes).toBe(150);
  });

  it('falls back to the scheduled window when not clocked', () => {
    expect(visitBillableMinutes(visit({ startMinute: 540, endMinute: 660 }))).toBe(120);
  });

  it('never returns a negative duration', () => {
    expect(
      visitBillableMinutes(
        visit({
          clockInAt: new Date('2026-07-01T09:00:00.000Z'),
          clockOutAt: new Date('2026-07-01T09:30:00.000Z'),
          breakMinutes: 90,
        }),
      ),
    ).toBe(0);
  });
});

describe('deriveRenderedQuantities', () => {
  it('sums hourly services, counts session services and maps visit types', () => {
    const quantities = deriveRenderedQuantities(
      [
        visit({ visitType: 'PERSONAL_CARE', startMinute: 540, endMinute: 660 }), // 2h
        visit({ visitType: 'MORNING_CARE', startMinute: 540, endMinute: 600 }), // 1h, same service
        visit({ visitType: 'MEDICATION', startMinute: 600, endMinute: 690 }), // 1.5h
        visit({ visitType: 'PHYSICAL_THERAPY' }),
        visit({ visitType: 'PHYSICAL_THERAPY' }),
      ],
      CATALOG,
    );

    expect(quantities.get('PERSONAL_CARE_SUPPORT')).toEqual({
      quantity: 3,
      sourceVisitCount: 2,
    });
    expect(quantities.get('MEDICATION_MANAGEMENT')?.quantity).toBe(1.5);
    expect(quantities.get('PHYSIOTHERAPY_SESSIONS')).toEqual({
      quantity: 2,
      sourceVisitCount: 2,
    });
    // The flat coordination fee applies once because care was rendered.
    expect(quantities.get('ADMIN_CARE_COORDINATION')?.quantity).toBe(1);
    // No visit type maps to meal prep, so it stays at zero.
    expect(quantities.get('NUTRITIONAL_MEAL_PREP')?.quantity).toBe(0);
  });

  it('rounds hourly quantities to two decimals', () => {
    const quantities = deriveRenderedQuantities(
      [visit({ visitType: 'PERSONAL_CARE', startMinute: 0, endMinute: 50 })], // 50 min = 0.833h
      CATALOG,
    );
    expect(quantities.get('PERSONAL_CARE_SUPPORT')?.quantity).toBe(0.83);
  });

  it('bills nothing when there were no visits', () => {
    const quantities = deriveRenderedQuantities([], CATALOG);
    for (const service of CATALOG) {
      expect(quantities.get(service.code)).toEqual({ quantity: 0, sourceVisitCount: 0 });
    }
  });

  it('ignores unmapped visit types but still charges the flat fee', () => {
    const quantities = deriveRenderedQuantities(
      [visit({ visitType: 'COMPANIONSHIP' }), visit({ visitType: 'WOUND_CARE' })],
      CATALOG,
    );
    expect(quantities.get('PERSONAL_CARE_SUPPORT')?.quantity).toBe(0);
    expect(quantities.get('ADMIN_CARE_COORDINATION')?.quantity).toBe(1);
  });
});
