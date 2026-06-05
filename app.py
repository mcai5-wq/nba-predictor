import streamlit as st
import pandas as pd
import joblib
import numpy as np
import plotly.express as px

st.set_page_config(page_title="Pro-Ops NBA Predictor", layout="wide")
st.title("Production Analytics Engine: NBA Playoff & Matchup Projections")

@st.cache_resource
def load_production_assets():
    try:
        model_pack = joblib.load('nba_production_model.pkl')
        data_records = pd.read_csv('nba_production_data.csv')
        return model_pack, data_records
    except FileNotFoundError:
        return None, None

model_pack, data_records = load_production_assets()

if model_pack is None:
    st.error("System Failure: Critical production model files are missing. Please execute 'data_pipeline.py' and 'train_model.py'.")
else:
    # Identify diff teams in database
    available_teams = sorted(list(set(data_records['TEAM_NAME_HOME'].unique())))
    
    st.sidebar.header("Matchup Configuration Engine")
    home_selection = st.sidebar.selectbox("Select Home Franchise", available_teams, index=0)
    away_selection = st.sidebar.selectbox("Select Away Franchise", available_teams, index=1)
    
    if home_selection == away_selection:
        st.sidebar.error("Validation Halt: Please select distinct competing franchises.")
    else:
        
        home_team_data = data_records[data_records['TEAM_NAME_HOME'] == home_selection].tail(1)
        away_team_data = data_records[data_records['TEAM_NAME_AWAY'] == away_selection].tail(1)
        
        # Fallbacks if historical lookups require a default state
        base_home_ppg = float(home_team_data['ROLLING_PPG_HOME'].iloc[0]) if len(home_team_data) > 0 else 114.2
        base_away_ppg = float(away_team_data['ROLLING_PPG_AWAY'].iloc[0]) if len(away_team_data) > 0 else 112.1

        base_home_allow = float(home_team_data['ROLLING_ALLOWED_PPG_HOME'].iloc[0]) if len(home_team_data) > 0 else 2.1
        base_away_allow = float(away_team_data['ROLLING_ALLOWED_PPG_AWAY'].iloc[0]) if len(away_team_data) > 0 else -1.5
        st.sidebar.markdown("---")
        st.sidebar.subheader("Live Feature Calibration Modifiers")
        h_ppg = st.sidebar.slider(f"{home_selection} Expected Offense", 95.0, 130.0, base_home_ppg)
        a_ppg = st.sidebar.slider(f"{away_selection} Expected Offense", 95.0, 130.0, base_away_ppg)
        h_rest = st.sidebar.slider(f"{home_selection} Schedule Rest Days", 0, 4, 2)
        a_rest = st.sidebar.slider(f"{away_selection} Schedule Rest Days", 0, 4, 2)

        # Assemble prediction parameters vectors
        inference_matrix = np.array([[h_rest, a_rest, h_ppg, a_ppg, base_home_allow, base_away_allow]])
        xgb_model = model_pack['model_instance']
        probs = xgb_model.predict_proba(inference_matrix)

# Assuming class 1 = home team win and class 0 = away team win
        home_prob_scalar = float(probs[0, 1])
        away_prob_scalar = float(probs[0, 0])

        col1, col2 = st.columns(2)

        with col1:
            st.markdown(f"### Matchup Analysis: **{home_selection}** vs **{away_selection}**")

            m1, m2 = st.columns(2)

            m1.metric(
                f"{home_selection} Probability",
                f"{home_prob_scalar * 100:.2f}%"
            )

            m2.metric(
                f"{away_selection} Probability",
                f"{away_prob_scalar * 100:.2f}%"
            )

            prob_df = pd.DataFrame({
                'Team Location': [
                    f"{home_selection} (Home)",
                    f"{away_selection} (Away)"
                ],
                'Calculated Win Probability': [
                    home_prob_scalar,
                    away_prob_scalar
                ]
            })

            fig_prob = px.bar(
                prob_df,
                x='Team Location',
                y='Calculated Win Probability',
                text_auto='.2%'
            )

            st.plotly_chart(fig_prob, use_container_width=True)

        with col2:
            st.markdown("### Production Feature Signatures")
            st.caption(
                "This data surfaces real coefficients mapped straight out of the optimized XGBoost architecture training iterations."
            )

            importance_map = model_pack['feature_importances']

            importance_df = pd.DataFrame(
                list(importance_map.items()),
                columns=['Input Feature', 'Relative Model Weight']
            )

            importance_df = importance_df.sort_values(
                'Relative Model Weight',
                ascending=True
            )

            fig_imp = px.bar(
                importance_df,
                x='Relative Model Weight',
                y='Input Feature',
                orientation='h'
            )

            st.plotly_chart(fig_imp, use_container_width=True)