import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Shield, Zap, Coffee, BarChart3, Info, TrendingUp } from 'lucide-react';

// Real-world baseline historical averages for every team to feed your model
const TEAM_STATS_DATABASE: Record<string, { offense: number; defense: number; rest: number }> = {
  "Atlanta Hawks": { offense: 116.5, defense: 120.0, rest: 1 },
  "Boston Celtics": { offense: 120.6, defense: 109.2, rest: 2 },
  "Brooklyn Nets": { offense: 111.2, defense: 114.8, rest: 1 },
  "Charlotte Hornets": { offense: 106.4, defense: 116.8, rest: 2 },
  "Chicago Bulls": { offense: 111.9, defense: 113.5, rest: 1 },
  "Cleveland Cavaliers": { offense: 112.6, defense: 110.2, rest: 2 },
  "Dallas Mavericks": { offense: 117.9, defense: 115.6, rest: 1 },
  "Denver Nuggets": { offense: 114.9, defense: 109.6, rest: 3 },
  "Detroit Pistons": { offense: 109.9, defense: 119.0, rest: 1 },
  "Golden State Warriors": { offense: 117.8, defense: 115.2, rest: 2 },
  "Houston Rockets": { offense: 114.3, defense: 113.2, rest: 1 },
  "Indiana Pacers": { offense: 123.3, defense: 120.2, rest: 1 },
  "LA Clippers": { offense: 115.6, defense: 112.3, rest: 2 },
  "Los Angeles Lakers": { offense: 118.0, defense: 117.4, rest: 1 },
  "Memphis Grizzlies": { offense: 105.8, defense: 112.8, rest: 2 },
  "Miami Heat": { offense: 110.1, defense: 108.4, rest: 1 },
  "Milwaukee Bucks": { offense: 119.4, defense: 116.4, rest: 2 },
  "Minnesota Timberwolves": { offense: 113.0, defense: 106.5, rest: 2 },
  "New Orleans Pelicans": { offense: 115.1, defense: 110.7, rest: 1 },
  "New York Knicks": { offense: 115.2, defense: 108.2, rest: 3 },
  "Oklahoma City Thunder": { offense: 120.1, defense: 111.0, rest: 2 },
  "Orlando Magic": { offense: 110.5, defense: 108.4, rest: 1 },
  "Philadelphia 76ers": { offense: 114.6, defense: 111.5, rest: 2 },
  "Phoenix Suns": { offense: 116.2, defense: 113.2, rest: 1 },
  "Portland Trail Blazers": { offense: 106.7, defense: 115.4, rest: 1 },
  "Sacramento Kings": { offense: 116.6, defense: 114.8, rest: 2 },
  "San Antonio Spurs": { offense: 112.1, defense: 118.6, rest: 1 },
  "Toronto Raptors": { offense: 112.4, defense: 118.8, rest: 2 },
  "Utah Jazz": { offense: 115.7, defense: 120.5, rest: 1 },
  "Washington Wizards": { offense: 113.7, defense: 123.0, rest: 1 }
};

const NBA_TEAMS = Object.keys(TEAM_STATS_DATABASE);

interface Insight {
  factor: string;
  text: string;
  impact: 'positive' | 'negative' | 'neutral';
}

interface PredictionData {
  home_win_margin: number;
  away_win_margin: number;
  insights: Insight[];
  weights: Record<string, number>;
}

export default function CourtVisionPredictor() {
  const [homeTeam, setHomeTeam] = useState("Charlotte Hornets");
  const [awayTeam, setAwayTeam] = useState("Brooklyn Nets");
  
  // State variables synchronized dynamically
  const [homeOffense, setHomeOffense] = useState(106.4);
  const [awayOffense, setAwayOffense] = useState(111.2);
  const [homeDefense, setHomeDefense] = useState(116.8);
  const [awayDefense, setAwayDefense] = useState(114.8);
  const [homeRest, setHomeRest] = useState(2);
  const [awayRest, setAwayRest] = useState(1);

  const [results, setResults] = useState<PredictionData>({
    home_win_margin: 50.0,
    away_win_margin: 50.0,
    insights: [],
    weights: {}
  });

  // CRITICAL AUTOMATION: Update numeric states whenever a new team is selected
  useEffect(() => {
    const homeMetrics = TEAM_STATS_DATABASE[homeTeam];
    if (homeMetrics) {
      setHomeOffense(homeMetrics.offense);
      setHomeDefense(homeMetrics.defense);
      setHomeRest(homeMetrics.rest);
    }
  }, [homeTeam]);

  useEffect(() => {
    const awayMetrics = TEAM_STATS_DATABASE[awayTeam];
    if (awayMetrics) {
      setAwayOffense(awayMetrics.offense);
      setAwayDefense(awayMetrics.defense);
      setAwayRest(awayMetrics.rest);
    }
  }, [awayTeam]);

  const fetchPrediction = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_team: homeTeam,
          away_team: awayTeam,
          home_offense: Number(homeOffense),
          away_offense: Number(awayOffense),
          home_defense: Number(homeDefense),
          away_defense: Number(awayDefense),
          home_rest: Math.round(Number(homeRest)),
          away_rest: Math.round(Number(awayRest))
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setResults(data);
      }
    } catch (err) {
      console.error("Failed to sync parameters with app.py:", err);
    }
  }, [homeTeam, awayTeam, homeOffense, awayOffense, homeDefense, awayDefense, homeRest, awayRest]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  const chartData = [
    { name: homeTeam, Probability: results.home_win_margin, fill: '#38bdf8' },
    { name: awayTeam, Probability: results.away_win_margin, fill: '#fb7185' }
  ];

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR: CONFIGURATOR PANEL */}
      <div className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-sky-400" /> Matchup Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-1">Adjust sliders to simulate alternate scenarios.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* TEAM SELECTION SECTIONS */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Team Affiliations</label>
            <div className="space-y-3">
              <div className="relative">
                <select 
                  value={homeTeam} 
                  onChange={(e) => setHomeTeam(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 appearance-none focus:outline-none focus:border-sky-500 cursor-pointer pr-10"
                >
                  {NBA_TEAMS.map(team => (
                    <option key={team} value={team} className="bg-slate-900 text-slate-200">{team} (Home)</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              <div className="relative">
                <select 
                  value={awayTeam} 
                  onChange={(e) => setAwayTeam(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 appearance-none focus:outline-none focus:border-rose-500 cursor-pointer pr-10"
                >
                  {NBA_TEAMS.map(team => (
                    <option key={team} value={team} className="bg-slate-900 text-slate-200">{team} (Away)</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* OFFENSIVE ANCHORS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
              <Zap className="h-4 w-4" /> Offensive Metrics (Rolling PPG)
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Home Offense</span>
                <span className="font-mono font-bold text-sky-400 bg-slate-950 px-2 rounded">{Number(homeOffense).toFixed(1)}</span>
              </div>
              <input type="range" min="90" max="135" step="0.5" value={homeOffense} onChange={(e) => setHomeOffense(parseFloat(e.target.value))} className="w-full accent-sky-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer border border-slate-800" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Away Offense</span>
                <span className="font-mono font-bold text-rose-400 bg-slate-950 px-2 rounded">{Number(awayOffense).toFixed(1)}</span>
              </div>
              <input type="range" min="90" max="135" step="0.5" value={awayOffense} onChange={(e) => setAwayOffense(parseFloat(e.target.value))} className="w-full accent-rose-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer border border-slate-800" />
            </div>
          </div>

          {/* DEFENSIVE ANCHORS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Shield className="h-4 w-4" /> Defensive Containment (Allowed PPG)
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Home Allowed PPG</span>
                <span className="font-mono font-bold text-emerald-400 bg-slate-950 px-2 rounded">{Number(homeDefense).toFixed(1)}</span>
              </div>
              <input type="range" min="90" max="135" step="0.5" value={homeDefense} onChange={(e) => setHomeDefense(parseFloat(e.target.value))} className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer border border-slate-800" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Away Allowed PPG</span>
                <span className="font-mono font-bold text-emerald-400 bg-slate-950 px-2 rounded">{Number(awayDefense).toFixed(1)}</span>
              </div>
              <input type="range" min="90" max="135" step="0.5" value={awayDefense} onChange={(e) => setAwayDefense(parseFloat(e.target.value))} className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer border border-slate-800" />
            </div>
          </div>

          {/* SITUATIONAL RATINGS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Coffee className="h-4 w-4" /> Rest Cycles (Days)
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Home Days Rest</span>
                <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 rounded">{homeRest} days</span>
              </div>
              <input type="range" min="0" max="5" step="1" value={homeRest} onChange={(e) => setHomeRest(parseInt(e.target.value))} className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer border border-slate-800" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Away Days Rest</span>
                <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 rounded">{awayRest} days</span>
              </div>
              <input type="range" min="0" max="5" step="1" value={awayRest} onChange={(e) => setAwayRest(parseInt(e.target.value))} className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer border border-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT WORKSPACE: ANALYTICS VISUALIZER */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">CourtVision Analytics Engine</h1>
          <p className="text-sm text-slate-400">Predictive Match Modeling based on Performance Metrics</p>
        </div>

        {/* PROBABILITY DISTRIBUTION CHART */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-400" /> Modeled Win Likelihood
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} className="text-xs font-medium" />
                <YAxis stroke="#64748b" unit="%" domain={[0, 100]} tickLine={false} axisLine={false} className="text-xs font-mono" />
                <Bar dataKey="Probability" radius={[4, 4, 0, 0]} maxBarSize={90}>
                  {chartData.map((entry, index) => (
                    <rect key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* DYNAMIC ATTRIBUTION PANEL (EVIDENCE BOX) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-400" /> Statistical Attribution & Evidence
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Contextual insights extracted from live input configurations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.insights.map((insight, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white tracking-wide">{insight.factor}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      insight.impact === 'positive' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      insight.impact === 'negative' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {insight.impact}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{insight.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* MODEL CORE WEIGHTS PANEL */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-400" /> Feature Contribution Map
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Relative Impact of each Metric on Final Calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {Object.entries(results.weights || {}).map(([feature, weight]) => (
                <div key={feature} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">{feature}</span>
                    <span className="text-slate-300 font-bold">{weight}% Importance</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${weight * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
}