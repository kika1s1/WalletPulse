import {GetAffiliateRecommendation} from '@domain/usecases/get-affiliate-recommendation';

describe('GetAffiliateRecommendation', () => {
  it('recommends Wise for high FX fees', () => {
    const rec = new GetAffiliateRecommendation();
    const result = rec.execute({totalFxFees: 4700, existingSources: []});
    expect(result).not.toBeNull();
    expect(result!.partner.id).toBe('wise');
    expect(result!.reason).toContain('conversion fees');
  });

  it('does not recommend Wise if already using Wise', () => {
    const rec = new GetAffiliateRecommendation();
    const result = rec.execute({totalFxFees: 4700, existingSources: ['Wise']});
    expect(result?.partner.id).not.toBe('wise');
  });

  it('recommends Grey for Africa region', () => {
    const rec = new GetAffiliateRecommendation();
    const result = rec.execute({region: 'Africa', existingSources: []});
    expect(result).not.toBeNull();
    expect(result!.partner.id).toBe('grey');
  });

  it('recommends Revolut for multi-currency users', () => {
    const rec = new GetAffiliateRecommendation();
    const result = rec.execute({
      currencies: ['USD', 'EUR', 'GBP'],
      existingSources: [],
    });
    expect(result).not.toBeNull();
    expect(result!.partner.id).toBe('revolut');
  });

  it('returns null when no context triggers match', () => {
    const rec = new GetAffiliateRecommendation();
    const result = rec.execute({existingSources: []});
    expect(result).toBeNull();
  });

  it('returns null when user already uses all relevant services', () => {
    const rec = new GetAffiliateRecommendation();
    const result = rec.execute({
      totalFxFees: 5000,
      region: 'Africa',
      currencies: ['USD', 'EUR', 'GBP'],
      existingSources: ['Wise', 'Grey', 'Revolut'],
    });
    expect(result).toBeNull();
  });

  it('respects weekly cooldown after dismiss', () => {
    const dismissed = new Map<string, number>();
    dismissed.set('wise', Date.now());
    const rec = new GetAffiliateRecommendation(dismissed);

    const result = rec.execute({totalFxFees: 5000, existingSources: []});
    expect(result?.partner.id).not.toBe('wise');
  });

  it('shows partner again after cooldown expires', () => {
    const oneWeekAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const dismissed = new Map<string, number>();
    dismissed.set('wise', oneWeekAgo);
    const rec = new GetAffiliateRecommendation(dismissed);

    const result = rec.execute({totalFxFees: 5000, existingSources: []});
    expect(result).not.toBeNull();
    expect(result!.partner.id).toBe('wise');
  });

  it('dismiss method records the timestamp', () => {
    const rec = new GetAffiliateRecommendation();
    rec.dismiss('wise');

    const result = rec.execute({totalFxFees: 5000, existingSources: []});
    expect(result?.partner.id).not.toBe('wise');
  });
});
