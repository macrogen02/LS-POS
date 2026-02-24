import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

type Order = {
  id: string;
  status: 'pending' | 'washing' | 'ready' | 'completed' | 'collected';
  items: Array<{ service?: { name: string } }>;
};

type ByMethodRow = { method: string; _sum: { amount: number | string | null } };

const peso = (value: number) => `₱${value.toFixed(2)}`;

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const escapePdfText = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const downloadSimplePdf = (filename: string, title: string, lines: string[]) => {
  const content = [`BT`, `/F1 16 Tf`, `50 790 Td`, `(${escapePdfText(title)}) Tj`, `/F1 11 Tf`];
  lines.forEach((line, index) => {
    content.push(`50 ${760 - index * 18} Td`);
    content.push(`(${escapePdfText(line)}) Tj`);
  });
  content.push('ET');
  const stream = content.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function ReportsPage() {
  const [daily, setDaily] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [byMethod, setByMethod] = useState<ByMethodRow[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const load = async () => {
      const [dailyRes, monthlyRes, ordersRes] = await Promise.all([
        api.get('/reports/daily-sales'),
        api.get('/reports/monthly-revenue'),
        api.get('/orders?page=1&pageSize=100')
      ]);
      setDaily(Number(dailyRes.data.data.total ?? 0));
      setMonthly(Number(monthlyRes.data.data.total ?? 0));
      setByMethod(monthlyRes.data.data.byMethod ?? []);
      setOrders(ordersRes.data.data.items ?? []);
    };
    load();
  }, []);

  const topService = useMemo(() => {
    const counter = new Map<string, number>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const name = item.service?.name;
        if (name) counter.set(name, (counter.get(name) ?? 0) + 1);
      });
    });
    return [...counter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';
  }, [orders]);

  const readyCount = useMemo(() => orders.filter((order) => order.status === 'ready').length, [orders]);
  const pickedCount = useMemo(() => orders.filter((order) => order.status === 'collected').length, [orders]);

  const chartRows = useMemo(
    () => [
      { label: 'Daily Sales', value: daily },
      { label: 'Monthly Sales', value: monthly },
      ...byMethod.map((entry) => ({ label: `Monthly (${entry.method})`, value: Number(entry._sum.amount ?? 0) }))
    ],
    [daily, monthly, byMethod]
  );

  const maxValue = Math.max(...chartRows.map((row) => row.value), 1);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Reports</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard title="Daily Sales" value={peso(daily)} />
        <MetricCard title="Monthly Sales (est.)" value={peso(monthly)} />
        <MetricCard title="Top Service" value={topService} />
        <MetricCard title="Ready for Pickup" value={`${readyCount}`} />
        <MetricCard title="Picked up" value={`${pickedCount}`} />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">Sales Visualization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {chartRows.map((row) => (
            <div key={row.label} className="rounded border p-2">
              <div className="flex justify-between text-sm mb-1">
                <span>{row.label}</span>
                <span>{peso(row.value)}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${(row.value / maxValue) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">Download Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded border p-3 space-y-2">
            <p className="font-medium">Daily Report</p>
            <div className="flex gap-2">
              <button
                className="rounded bg-emerald-600 px-3 py-1.5 text-white"
                onClick={() => downloadCsv('daily-report.csv', [['Report', 'Amount'], ['Daily Sales', daily]])}
              >
                Download Excel (CSV)
              </button>
              <button
                className="rounded bg-slate-800 px-3 py-1.5 text-white"
                onClick={() => downloadSimplePdf('daily-report.pdf', 'Daily Report', [`Daily Sales: ${peso(daily)}`])}
              >
                Download PDF
              </button>
            </div>
          </div>

          <div className="rounded border p-3 space-y-2">
            <p className="font-medium">Monthly Report</p>
            <div className="flex gap-2 flex-wrap">
              <button
                className="rounded bg-emerald-600 px-3 py-1.5 text-white"
                onClick={() =>
                  downloadCsv('monthly-report.csv', [
                    ['Report', 'Amount'],
                    ['Monthly Total', monthly],
                    ...byMethod.map((entry) => [`Monthly (${entry.method})`, Number(entry._sum.amount ?? 0)])
                  ])
                }
              >
                Download Excel (CSV)
              </button>
              <button
                className="rounded bg-slate-800 px-3 py-1.5 text-white"
                onClick={() =>
                  downloadSimplePdf('monthly-report.pdf', 'Monthly Report', [
                    `Monthly Total: ${peso(monthly)}`,
                    ...byMethod.map((entry) => `${entry.method}: ${peso(Number(entry._sum.amount ?? 0))}`)
                  ])
                }
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="text-4xl font-bold mt-1 leading-none">{value}</p>
    </div>
  );
}
