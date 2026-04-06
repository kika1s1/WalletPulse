import {advanceNextDueDate} from '@shared/utils/advance-next-due-date';

describe('advanceNextDueDate', () => {
  it('adds 7 days for weekly', () => {
    const from = new Date(2024, 5, 10, 12, 0, 0).getTime();
    const next = advanceNextDueDate(from, 'weekly');
    expect(next - from).toBe(7 * 86400000);
  });

  it('adds one calendar month and clamps Jan 31 to Feb last day', () => {
    const jan31 = new Date(2023, 0, 31, 9, 30, 0).getTime();
    const next = advanceNextDueDate(jan31, 'monthly');
    const d = new Date(next);
    expect(d.getFullYear()).toBe(2023);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(28);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
  });

  it('Jan 31 + monthly in leap year becomes Feb 29', () => {
    const jan31Leap = new Date(2024, 0, 31, 0, 0, 0).getTime();
    const next = advanceNextDueDate(jan31Leap, 'monthly');
    const d = new Date(next);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(29);
  });

  it('adds three months for quarterly with end-of-month clamp', () => {
    const may31 = new Date(2024, 4, 31, 15, 0, 0).getTime();
    const next = advanceNextDueDate(may31, 'quarterly');
    const d = new Date(next);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(31);
  });

  it('adds twelve months for yearly', () => {
    const mar15 = new Date(2022, 2, 15, 10, 0, 0).getTime();
    const next = advanceNextDueDate(mar15, 'yearly');
    const d = new Date(next);
    expect(d.getFullYear()).toBe(2023);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(15);
  });
});
