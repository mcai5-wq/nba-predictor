from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI()

# Allows TypeScript frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "nba_production_model.pkl")

checkpoint = joblib.load(model_path)
if isinstance(checkpoint, dict) and "model" in checkpoint:
    model = checkpoint["model"]
else:
    model = checkpoint

class MatchupRequest(BaseModel):
    home_offense: float
    away_offense: float
    home_rest: int
    away_rest: int

@app.post("/api/predict")
def get_prediction(data: MatchupRequest):
    try:
        # 1. Format incoming numbers into a 2D array
        input_features = np.array([[
            float(data.home_offense), 
            float(data.away_offense), 
            int(data.home_rest), 
            int(data.away_rest)
        ]])
        
        probabilities_matrix = model.predict_proba(input_features)
        
        prob_list = probabilities_matrix.flatten().tolist()
        
        # Binary classification array format: [probability_class_0, probability_class_1]
        # Class 0 = Away Win, Class 1 = Home Win
        away_percentage = round(prob_list[0] * 100, 2)
        home_percentage = round(prob_list[1] * 100, 2)

        return {
            "home_win_margin": home_percentage,
            "away_win_margin": away_percentage
        }
        
    except Exception as e:
        print("!!! DETECTED CRASH IN ENDPOINT !!!")
        print(str(e))
        return {
            "home_win_margin": 50.0,
            "away_win_margin": 50.0,
            "error": str(e)
        }