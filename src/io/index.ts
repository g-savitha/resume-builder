// io: files in and out. The app's own JSON (whole document) and JSON Resume (content only). Pure: no DOM, no
// storage; validation of a native file is storage's schema, applied by the caller.
export { exportNative, nativeDocument, NATIVE_FORMAT, type NativeFile } from './native';
export { fromJsonResume, isJsonResume, toJsonResume, type JsonResumeExport, type JsonResumeImport } from './jsonResume';
