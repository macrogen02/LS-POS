import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ReportsPage() {
  const [daily, setDaily] = useState(0);
  const [monthly, setMonthly] = useState(0);
  useEffect(() => {
    api.get('/reports/daily-sales').then((r) => setDaily(r.data.data.total));
    api.get('/reports/monthly-revenue').then((r) => setMonthly(r.data.data.total));
  }, []);

  return <div className="space-y-2"><h2 className="text-2xl font-bold">Reports</h2><p>Daily sales: ${daily}</p><p>Monthly revenue: ${monthly}</p></div>;
}
