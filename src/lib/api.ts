export async function request<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(data?.error || `请求失败 (${res.status})`);
  }
  return data;
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function useToast() {
  return {
    success: (msg: string) => {
      const el = document.createElement("div");
      el.textContent = msg;
      el.className =
        "fixed top-5 right-5 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-in";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    },
    error: (msg: string) => {
      const el = document.createElement("div");
      el.textContent = msg;
      el.className =
        "fixed top-5 right-5 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-in";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    },
    info: (msg: string) => {
      const el = document.createElement("div");
      el.textContent = msg;
      el.className =
        "fixed top-5 right-5 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-in";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    },
  };
}
