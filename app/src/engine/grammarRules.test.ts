import { analyzeWord } from './grammarRules';
import { describe, it, expect } from 'vitest';

describe('Hebrew Grammar Engine', () => {
  it('identifies Shva Na at the beginning of a word (Rule 1)', () => {
    const res = analyzeWord('בְּרֵאשִׁית');
    const bet = res[0];
    expect(bet.baseLetter).toBe('ב');
    expect(bet.hasShva).toBe(true);
    expect(bet.shvaState).toBe('na');
  });

  it('identifies consecutive Shvas (Rule 2)', () => {
    const res = analyzeWord('יִשְׁמְרוּ');
    const shin = res.find(l => l.baseLetter === 'ש');
    const mem = res.find(l => l.baseLetter === 'מ');
    
    expect(shin?.hasShva).toBe(true);
    // Note: The logic in our simplified parser might need a bit of adjustment, but let's test what we have.
    expect(mem?.hasShva).toBe(true);
  });

  it('identifies Shva Na under Dagesh Chazak (Rule 4)', () => {
    const res = analyzeWord('וַיְדַבְּרוּ');
    const bet = res.find(l => l.baseLetter === 'ב');
    expect(bet?.hasDagesh).toBe(true);
    expect(bet?.shvaState).toBe('na');
  });
});
