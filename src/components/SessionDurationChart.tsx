'use client';

import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

type SessionDurationData = {
  date: string;
  avgDuration: number;
};

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

export default function SessionDurationChart({ data }: { data: SessionDurationData[] }) {
  const chartData = {
    labels: data.map(item => item.date),
    datasets: [
      {
        label: 'Average Session Duration (minutes)',
        data: data.map(item => item.avgDuration),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      }
    ]
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-medium mb-4">Session Duration Analytics</h3>
      <Bar 
        data={chartData} 
        options={{
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }} 
      />
    </div>
  );
}
