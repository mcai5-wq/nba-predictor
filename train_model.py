import pandas as pd
from xgboost import XGBClassifier
from sklearn.metrics import log_loss, roc_auc_score
import joblib

def run_training_suite():
    print("Loading production feature sets...")
    df = pd.read_csv('nba_production_data.csv')
    df = df.sort_values('GAME_DATE_HOME').reset_index(drop=True)
    
    # Define our mathematical features vector
    feature_columns = [
        'DAYS_REST_HOME', 'DAYS_REST_AWAY', 
        'ROLLING_PPG_HOME', 'ROLLING_PPG_AWAY',
        'ROLLING_ALLOWED_PPG_HOME', 'ROLLING_ALLOWED_PPG_AWAY'
    ]
    
    X = df[feature_columns]
    y = df['HOME_WIN_TARGET']
    
    # 9/10 Time-Series Walkforward validation split (80% training data, 20% future evaluation data)
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    print(f"Training records count: {len(X_train)} | Validation test records: {len(X_test)}")
    
    model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='logloss'
    )
    
    model.fit(X_train, y_train)
    
    # Compute operational deployment metrics
    probs = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, probs)
    loss = log_loss(y_test, probs)
    
    print("\n--- ENTERPRISE EVALUATION METRICS ---")
    print(f"Model Calibration LogLoss Score: {loss:.4f} (Lower = Better)")
    print(f"Model Discrimination ROC-AUC Score: {auc:.4f} (Target baseline > 0.65)")
    
    # Export model artifact metadata together for UI framework consumption
    payload = {
        'model_instance': model,
        'features_list': feature_columns,
        'feature_importances': dict(zip(feature_columns, model.feature_importances_))
    }
    
    joblib.dump(payload, 'nba_production_model.pkl')
    print("\nSaved production artifact pipeline as 'nba_production_model.pkl'.")

if __name__ == "__main__":
    run_training_suite()