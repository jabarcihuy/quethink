import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';
import { messages, type Locale, type MessageKey } from './messages';

const storageKey = 'quethink.locale.v1';
type LocaleContextValue = {
  locale: Locale;
  setLocale: (value: Locale) => Promise<void>;
  saving: boolean;
  error: MessageKey | null;
  t: (key: MessageKey) => string;
};
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>('en');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (active && (stored === 'en' || stored === 'id')) updateLocale(stored);
      })
      .catch(() => { if (active) setError('preferenceLoadError'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  async function setLocale(value: Locale) {
    setSaving(true);
    setError(null);
    try {
      await AsyncStorage.setItem(storageKey, value);
      updateLocale(value);
    } catch {
      setError('languageError');
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} accessibilityLabel={messages.en.loading} /></View>;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, saving, error, t: (key) => messages[locale][key] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale requires LocaleProvider');
  return value;
}

const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' } });
