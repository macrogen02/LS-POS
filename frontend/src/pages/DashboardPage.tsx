import { useEffect, useState } from 'react';
import api from '../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ daily: 0, monthly: 0 });

  useEffect(() => {
    Promise.allSettled([api.get('/reports/daily-sales'), api.get('/reports/monthly-revenue')]).then((r) => {
      setStats({
        daily: r[0].status === 'fulfilled' ? r[0].value.data.data.total : 0,
        monthly: r[1].status === 'fulfilled' ? r[1].value.data.data.total : 0
      });
    });
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-3">Dashboard</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded p-4 shadow">Daily Sales: ${stats.daily}</div>
        <div className="bg-white rounded p-4 shadow">Monthly Revenue: ${stats.monthly}</div>
      </div>
    </div>
  );
}
