// Mock implementation of react-i18next
const t = (key: string) => key;
const i18n = {
  t,
  language: 'en',
  changeLanguage: () => new Promise(() => {}),
  on: () => {},
  off: () => {},
  getFixedT: () => t,
};

export { t, i18n };
export default { t, i18n };
