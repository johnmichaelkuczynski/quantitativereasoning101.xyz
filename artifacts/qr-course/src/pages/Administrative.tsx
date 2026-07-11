import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { ShieldCheck, Users } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type SeriesPoint = { label: string; count: number };

type AdminAnalytics = {
  stats: {
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
    allTime: number;
  };
  series: {
    lastDay: SeriesPoint[];
    lastWeek: SeriesPoint[];
    lastMonth: SeriesPoint[];
    lastYear: SeriesPoint[];
    allTime: SeriesPoint[];
  };
  visits: { id: number; email: string | null; visitedAt: string }[];
};

const WINDOWS: { key: keyof AdminAnalytics["stats"]; label: string }[] = [
  { key: "lastDay", label: "Last day" },
  { key: "lastWeek", label: "Last week" },
  { key: "lastMonth", label: "Last month" },
  { key: "lastYear", label: "Last year" },
  { key: "allTime", label: "All time" },
];

function LoginChart({ title, data }: { title: string; data: SeriesPoint[] }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} />
            <Tooltip
              formatter={(value: number | string) => [value, "Logins"]}
              labelClassName="text-foreground"
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Administrative() {
  const auth = useAuth();
  const isAdmin = auth.status === "signedIn" && auth.isAdmin;

  const { data, isLoading, error } = useQuery<AdminAnalytics>({
    queryKey: ["admin-analytics"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  if (!isAdmin) {
    return (
      <Layout>
        <div className="p-8 max-w-xl">
          <h1 className="text-2xl font-serif font-semibold mb-2">Administrative</h1>
          <p className="text-muted-foreground">
            This page is restricted to the site administrator.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8 max-w-6xl">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-serif font-semibold">Administrative</h1>
            <p className="text-muted-foreground text-sm">
              Google login activity and analytics.
            </p>
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading login analytics…</p>}
        {error && (
          <p className="text-destructive">
            Failed to load analytics: {(error as Error).message}
          </p>
        )}

        {data && (
          <>
            <section>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {WINDOWS.map((w) => (
                  <div
                    key={w.key}
                    className="p-4 rounded-lg border border-border bg-card"
                    data-testid={`stat-${w.key}`}
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {w.label}
                    </p>
                    <p className="text-3xl font-serif font-semibold mt-1">
                      {data.stats[w.key]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">logins</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-serif font-semibold border-b pb-2">
                Login graphs
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {WINDOWS.map((w) => (
                  <LoginChart
                    key={w.key}
                    title={`Logins — ${w.label.toLowerCase()}`}
                    data={data.series[w.key]}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-serif font-semibold border-b pb-2 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Who has logged in
              </h2>
              {data.visits.length === 0 ? (
                <p className="text-muted-foreground">No logins recorded yet.</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary text-left">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Gmail</th>
                        <th className="px-4 py-2.5 font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.visits.map((v) => (
                        <tr key={v.id} className="border-t border-border">
                          <td className="px-4 py-2.5" data-testid={`visit-email-${v.id}`}>
                            {v.email ?? "(no email)"}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {new Date(v.visitedAt).toLocaleString("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
