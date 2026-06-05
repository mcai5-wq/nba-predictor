/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { Slider } from "@/components/ui/slider";
import { BarChart, Bar, XAxis, YAxis } from 'recharts'; // Removed ResponsiveContainer to stop the hook crash

export default function Predictor() {
  // 1. Keep track of visual states
  const [homeOffense, setHomeOffense] = useState<number>(119.4);
  const [awayOffense, setAwayOffense] = useState<number>(105.2);
  const [probabilities, setProbabilities] = useState({ home: 50, away: 50 });

  // 2. Function to fetch data from app.py
  const fetchPrediction = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_offense: homeOffense,
          away_offense: awayOffense,
          home_rest: 2,
          away_rest: 2,
        }),
      });
      const data = await response.json();

      setProbabilities({ 
        home: data.home_win_margin ?? 50, 
        away: data.away_win_margin ?? 50 
      });
    } catch (error) {
      console.error("Failed to fetch prediction from app.py:", error);
    }
  };


  useEffect(() => {
    fetchPrediction();
  }, [homeOffense, awayOffense]);

  // Formatted data specifically laid out for the Chart component
  const chartData = [
    { name: 'Charlotte Hornets', Probability: probabilities.home },
    { name: 'Brooklyn Nets', Probability: probabilities.away },
  ];

  // 3. Render the gorgeous user interface
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50 font-sans">
      {/* Sidebar Controls */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900 p-6 space-y-6">
        <h2 className="text-xl font-bold tracking-tight">Matchup Configuration</h2>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Home Expected Offense ({homeOffense})</label>
          <Slider 
            min={80} max={140} step={0.1} 
            value={[homeOffense]} 

            onValueChange={(val: number[]) => setHomeOffense(val[0])}
          />
        </div>
      </aside>


      <main className="flex-1 p-10 space-y-8">
        <h1 className="text-3xl font-extrabold tracking-tight">CourtVision Analytics Engine</h1>
        

        <div className="h-64 bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-center">
          <BarChart width={600} height={220} data={chartData}>
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" unit="%" />
            <Bar dataKey="Probability" fill="#38bdf8" radius={8} />
          </BarChart>
        </div>
      </main>
    </div>
  );
}