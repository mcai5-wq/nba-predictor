from nba_api.stats.endpoints import leaguegamelog
import pandas as pd
import numpy as np
import time

def build_production_pipeline():
    print("Step 1: Connecting to stats.nba.com via official NBA API...")
    
    # Updated to include the 2025-26 season data
    seasons = ['2023-24', '2024-25', '2025-26']
    raw_logs = []
    
    for season in seasons:
        print(f"-> Pulling data matrix for season: {season}...")
        try:
            log = leaguegamelog.LeagueGameLog(
                season=season, 
                league_id_all_teams='00', 
                season_type_all_star='Regular Season'
            )
            raw_logs.append(log.get_data_frames())
            # Explicit API backoff delays prevent getting rate-limited
            time.sleep(2) 
        except Exception as e:
            print(f"API connection fault for season {season}: {e}")
            return
            
    df = pd.concat(raw_logs, ignore_index=True)
    df['GAME_DATE'] = pd.to_datetime(df['GAME_DATE'])
    df = df.sort_values('GAME_DATE').reset_index(drop=True)
    
    print("Step 2: Running temporal feature engineering...")
    # Calculate historical metrics per team before splitting into matchups to avoid data leakage
    df['ROLLING_PPG'] = df.groupby('TEAM_NAME')['PTS'].transform(
        lambda x: x.shift(1).rolling(window=5, min_periods=1).mean()
    )
    df['ROLLING_ALLOWED_PPG'] = df.groupby('TEAM_NAME')['PLUS_MINUS'].transform(
        lambda x: x.shift(1).rolling(window=5, min_periods=1).mean()
    )
    
    # Calculate true travel/fatigue rest days
    df['DAYS_REST'] = df.groupby('TEAM_NAME')['GAME_DATE'].diff().dt.days
    df['DAYS_REST'] = df['DAYS_REST'].fillna(3).clip(upper=4) # Default to 3, max advantage cap at 4
    
    print("Step 3: Resolving structural matchup layout pairs...")
    # Filter out home records ('vs.') vs away records ('@') to flatten the data model
    home_games = df[df['MATCHUP'].str.contains('vs.')].copy()
    away_games = df[df['MATCHUP'].str.contains('@')].copy()
    
    # Merge rows on the unique game tracking identifier
    processed_df = pd.merge(
        home_games, 
        away_games, 
        on='GAME_ID', 
        suffixes=('_HOME', '_AWAY')
    )
    
    # Clean up and select the features recruiters look for
    final_features = processed_df[[
        'GAME_ID', 'GAME_DATE_HOME', 'TEAM_NAME_HOME', 'TEAM_NAME_AWAY',
        'DAYS_REST_HOME', 'DAYS_REST_AWAY', 'ROLLING_PPG_HOME', 'ROLLING_PPG_AWAY',
        'ROLLING_ALLOWED_PPG_HOME', 'ROLLING_ALLOWED_PPG_AWAY', 'WL_HOME'
    ]].copy()
    
    # Convert home win column to binary outcome indicator (1 = Win, 0 = Loss)
    final_features['HOME_WIN_TARGET'] = final_features['WL_HOME'].apply(lambda x: 1 if x == 'W' else 0)
    
    final_features.to_csv('nba_production_data.csv', index=False)
    print("Pipeline execution successful. Output saved as 'nba_production_data.csv'.")

if __name__ == "__main__":
    build_production_pipeline()