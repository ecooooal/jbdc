// Expo's preset installs lazy globals (fetch, URL, structuredClone, ...) that
// `require` their implementation on first read. Jest 30 reads every enumerable
// global during teardown, where a lazy require is illegal. Resolve them while
// setup code still may require.
void globalThis.structuredClone;
void globalThis.URL;
void globalThis.URLSearchParams;
void globalThis.DOMException;
void globalThis.TextDecoderStream;
void globalThis.TextEncoderStream;
void globalThis.fetch;
void globalThis.__ExpoImportMetaRegistry;
