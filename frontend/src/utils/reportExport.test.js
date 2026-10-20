import { canExportFinance, num, pdfMoney } from './reportExport';

test('only fleet managers and financial analysts can export finance reports', () => {
  expect(canExportFinance('fleet_manager')).toBe(true);
  expect(canExportFinance('financial_analyst')).toBe(true);
  expect(canExportFinance('driver')).toBe(false);
  expect(canExportFinance('safety_officer')).toBe(false);
  expect(canExportFinance(undefined)).toBe(false);
});

test('numbers from the API (strings / null) are coerced safely', () => {
  expect(num('45000.50')).toBe(45000.5);
  expect(num(null)).toBe(0);
  expect(num('n/a')).toBe(0);
  expect(pdfMoney('45000')).toBe('Rs. 45,000');
});
