export async function fetchDemo({ degree, lambda }, { signal } = {}) {
  const query = new URLSearchParams({ degree: String(degree), lambda: String(lambda) });
  const response = await fetch(`/api/demo?${query}`, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? `The local API returned ${response.status}`);
  }
  return response.json();
}
