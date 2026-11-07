export const colors = {
  primary: '#5145CD',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EEEAFF',
  background: '#FCFAF8',
  surface: '#FFFFFF',
  onSurface: '#24243A',
  onSurfaceVariant: '#626477',
  outline: '#D8D5E2',
  secondaryContainer: '#F6D2B2',
  onSecondaryContainer: '#4C2D18',
  secondaryText: '#6E4021',
  successContainer: '#E2F3EB',
  success: '#176B61',
  error: '#B42318',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 40 } as const;
export const radius = { control: 12, surface: 16 } as const;
export const type = {
  headline: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  subtitle: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
} as const;
