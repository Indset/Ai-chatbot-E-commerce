"""
Train negotiation models (SVR + k-NN) and a retrieval-based dialogue model.

Usage:
  python train_negotiation_models.py --data data/negotiation.csv

The script expects either:
- a CSV with columns: base_price,user_price,suggested_price  (for price models)
- optionally a CSV or JSON with columns: user_text,bot_text (for dialogue retrieval)

If training data is not provided, the script will train synthetic price models
so the backend can use SVR + k-NN for counteroffers.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import json

try:
    import pandas as pd
    from sklearn.svm import SVR
    from sklearn.neighbors import KNeighborsRegressor, NearestNeighbors
    from sklearn.feature_extraction.text import TfidfVectorizer
    import joblib
    import numpy as np
except Exception as e:
    print('Missing training dependencies:', e)
    print('Install with: pip install pandas scikit-learn joblib numpy')
    raise


def train_price_models(df, models_dir: Path):
    # Expect columns: base_price,user_price,suggested_price
    X = df[["base_price", "user_price"]].values.astype(float)
    y = df["suggested_price"].values.astype(float)

    svr = SVR(kernel="rbf", C=100, gamma=0.5, epsilon=0.1)
    knn = KNeighborsRegressor(n_neighbors=5, weights="distance")

    svr.fit(X, y)
    knn.fit(X, y)

    models_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(svr, models_dir / "svr_model.joblib")
    joblib.dump(knn, models_dir / "knn_model.joblib")
    print('Saved SVR and k-NN price models to', models_dir)


def train_dialogue_retrieval(df, models_dir: Path):
    # Expect columns: user_text, bot_text
    vectorizer = TfidfVectorizer(max_features=10000)
    X = vectorizer.fit_transform(df["user_text"].astype(str).values)

    nn = NearestNeighbors(n_neighbors=1, metric="cosine").fit(X)

    models_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(vectorizer, models_dir / "dialogue_vectorizer.joblib")
    joblib.dump(nn, models_dir / "dialogue_knn.joblib")

    # Save responses aligned by index
    responses = df["bot_text"].astype(str).tolist()
    with open(models_dir / "dialogue_responses.json", "w", encoding="utf-8") as fh:
        json.dump(responses, fh, ensure_ascii=False, indent=2)

    print('Saved dialogue retrieval models to', models_dir)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", help="Path to training CSV/JSON", default=None)
    parser.add_argument("--models-dir", help="Where to save models", default="../models")
    args = parser.parse_args()

    models_dir = Path(__file__).resolve().parents[1] / "models"
    if args.models_dir:
        models_dir = Path(args.models_dir)

    if not args.data:
        # Train synthetic price models using negotiation service approach
        print('No dataset provided - training synthetic price models...')
        base_prices = np.linspace(10, 500, 50)
        user_ratios = np.linspace(0.5, 1.05, 60)
        rows = []
        for b in base_prices:
            for r in user_ratios:
                up = b * r
                # synthetic suggested: move 60% toward base price
                suggested = round(up + (b - up) * 0.6, 2)
                rows.append({"base_price": b, "user_price": up, "suggested_price": suggested})
        df = pd.DataFrame(rows)
        train_price_models(df, models_dir)
        return

    data_path = Path(args.data)
    if not data_path.exists():
        print('Data path not found:', data_path)
        return

    # Try reading CSV or JSON
    if data_path.suffix.lower() in [".csv"]:
        df = pd.read_csv(data_path)
    else:
        try:
            df = pd.read_json(data_path)
        except Exception:
            df = pd.read_csv(data_path)

    # Train price models if required columns present
    if {"base_price", "user_price", "suggested_price"}.issubset(set(df.columns)):
        train_price_models(df, models_dir)
    else:
        print('Price columns not found; skipping price model training.')

    # Train dialogue retrieval if user_text/bot_text present
    if {"user_text", "bot_text"}.issubset(set(df.columns)):
        train_dialogue_retrieval(df[["user_text", "bot_text"]], models_dir)
    else:
        print('Dialogue columns not found; skipping dialogue retrieval training.')


if __name__ == '__main__':
    main()
