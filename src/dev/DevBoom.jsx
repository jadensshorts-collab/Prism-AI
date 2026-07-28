// DEV-ONLY: deliberately throws during render so the ErrorBoundary's fallback
// can be verified rather than assumed.
export default function DevBoom() {
  const bad = null;
  return <div>{bad.thisWillThrow.deeply}</div>;
}
