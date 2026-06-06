from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "nba_production_model.pkl")

checkpoint = joblib.load(model_path)

# Extract model and metadata from your pipeline checkpoint dictionary safely
if isinstance(checkpoint, dict):
    model = checkpoint.get("model_instance")
    feature_names = checkpoint.get("features_list", ["DAYS_REST_HOME", "DAYS_REST_AWAY", "ROLLING_PPG_HOME", "ROLLING_PPG_AWAY", "ROLLING_ALLOWED_PPG_HOME", "ROLLING_ALLOWED_PPG_AWAY"])
    # Check if feature_importances is a dictionary or a list
    raw_importances = checkpoint.get("feature_importances", [0.15, 0.10, 0.30, 0.25, 0.10, 0.10])
    
    if isinstance(raw_importances, dict):
        importances = [
            raw_importances.get('DAYS_REST_HOME', 0.15),
            raw_importances.get('DAYS_REST_AWAY', 0.10),
            raw_importances.get('ROLLING_PPG_HOME', 0.30),
            raw_importances.get('ROLLING_PPG_AWAY', 0.25),
            raw_importances.get('ROLLING_ALLOWED_PPG_HOME', 0.10),
            raw_importances.get('ROLLING_ALLOWED_PPG_AWAY', 0.10)
        ]
    else:
        importances = raw_importances if not isinstance(raw_importances, str) else [0.15, 0.10, 0.30, 0.25, 0.10, 0.10]
else:
    model = checkpoint
    importances = [0.15, 0.10, 0.30, 0.25, 0.10, 0.10]

class MatchupRequest(BaseModel):
    home_team: str
    away_team: str
    home_offense: float
    away_offense: float
    home_defense: float
    away_defense: float
    home_rest: int
    away_rest: int

@app.post("/api/predict")
def get_prediction(data: MatchupRequest):
    try:
        input_features = np.array([[
            int(data.home_rest),          # DAYS_REST_HOME
            int(data.away_rest),          # DAYS_REST_AWAY
            float(data.home_offense),     # ROLLING_PPG_HOME
            float(data.away_offense),     # ROLLING_PPG_AWAY
            float(data.home_defense),     # ROLLING_ALLOWED_PPG_HOME
            float(data.away_defense)      # ROLLING_ALLOWED_PPG_AWAY
        ]])
        
        probabilities_matrix = model.predict_proba(input_features)
        flat_probs = np.array(probabilities_matrix).flatten().tolist()
        
        away_percentage = round(flat_probs[0] * 100, 1)
        home_percentage = round(flat_probs[1] * 100, 1)

        insights = []
        
        # 1. Evaluate Rest Factor
        if data.home_rest > data.away_rest:
            insights.append({"factor": "Schedule Advantage", "text": f"{data.home_team} has an edge with {data.home_rest} days of rest vs {data.away_team}'s {data.away_rest} days.", "impact": "positive"})
        elif data.away_rest > data.home_rest:
            insights.append({"factor": "Fatigue Factor", "text": f"{data.home_team} is at a rest disadvantage ({data.home_rest} days vs {data.away_team}'s {data.away_rest} days).", "impact": "negative"})

        # 2. Evaluate Offensive Outpacing
        offense_diff = data.home_offense - data.away_offense
        if offense_diff > 5:
            insights.append({"factor": "Firepower Mismatch", "text": f"{data.home_team}'s rolling offense ({data.home_offense} PPG) significantly outpacing {data.away_team} ({data.away_offense} PPG).", "impact": "positive"})
        elif offense_diff < -5:
            insights.append({"factor": "Defensive Stress", "text": f"{data.away_team}'s high-octane offense ({data.away_offense} PPG) poses a major threat to {data.home_team}.", "impact": "negative"})

        # 3. Evaluate Defensive Containment
        if data.home_defense < data.away_defense - 3:
            insights.append({"factor": "Defensive Efficiency", "text": f"{data.home_team} holds a superior defensive profile, allowing fewer points per game ({data.home_defense}) than {data.away_team} ({data.away_defense}).", "impact": "positive"})

        if not insights:
            insights.append({"factor": "Baseline Matchup", "text": "Teams are evenly matched across primary stat dimensions; historical home court baseline weighing heavily.", "impact": "neutral"})

        return {
            "home_win_margin": home_percentage,
            "away_win_margin": away_percentage,
            "insights": insights,
            "weights": {name: round(float(weight) * 100, 1) for name, weight in zip(feature_names, importances)}
        }
        
    except Exception as e:
        print(f"!!! BACKEND EXCEPTION: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))