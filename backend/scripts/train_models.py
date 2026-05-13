"""
Training script for negotiation models.
Loads CSV data, trains SVR and k-NN, evaluates MAE, and saves models to disk.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsRegressor
from sklearn.svm import SVR

# ✅ CSV path — project folder mein negotation.csv
CSV_PATH = Path(__file__).resolve().parents[2] / "negotation.csv"

# Fallback — Downloads folder
if not CSV_PATH.exists():
    CSV_PATH = Path(r"c:\Users\mdkam\Downloads\project\negotation.csv")

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

SVR_PATH   = MODELS_DIR / "svr_model.joblib"
KNN_PATH   = MODELS_DIR / "knn_model.joblib"
METRICS_PATH = MODELS_DIR / "training_metrics.json"


def load_dataset() -> pd.DataFrame:
    """Load negotiation dataset from CSV — tumhara actual CSV columns use karo."""
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    df = pd.read_csv(CSV_PATH)
    print(f"✓ CSV loaded: {len(df)} rows")
    print(f"  Columns: {list(df.columns)}")

    # ✅ Tumhare CSV ke actual column names
    required = {"Price", "Negotiated Price", "Discount (%)"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in CSV: {', '.join(sorted(missing))}")

    return df


def build_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """
    Features banao tumhare CSV se:
    - base_price   = Price column
    - user_offer   = Price * (1 - discount/100)  → simulated user offer
    - target       = Negotiated Price             → ML ka target
    """
    base_price      = df["Price"].astype(float).values
    discount        = df["Discount (%)"].astype(float).fillna(0).values
    negotiated_price = df["Negotiated Price"].astype(float).values

    # User offer simulate karo — discount ke basis pe
    # Agar discount 10% hai toh user ne ~10% kam offer kiya hoga
    user_offer = base_price * (1 - discount / 100)

    # Features: [base_price, user_offer]
    X = np.column_stack([base_price, user_offer])

    # Target: negotiated_price (actual deal price)
    y = negotiated_price

    print(f"  Features shape: {X.shape}")
    print(f"  Price range: ${base_price.min():.2f} - ${base_price.max():.2f}")
    print(f"  Avg discount: {discount.mean():.1f}%")

    return X, y


def train_models(X: np.ndarray, y: np.ndarray) -> tuple[SVR, KNeighborsRegressor, dict]:
    """Train SVR and k-NN regressors and compute MAE metrics."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"\nTraining on {len(X_train)} samples, testing on {len(X_test)} samples...")

    svr = SVR(kernel="rbf", C=100, gamma=0.1, epsilon=0.1)
    knn = KNeighborsRegressor(n_neighbors=5, weights="distance")

    svr.fit(X_train, y_train)
    print("✓ SVR trained")

    knn.fit(X_train, y_train)
    print("✓ k-NN trained")

    svr_pred = svr.predict(X_test)
    knn_pred = knn.predict(X_test)

    metrics = {
        "svr_mae":  float(mean_absolute_error(y_test, svr_pred)),
        "knn_mae":  float(mean_absolute_error(y_test, knn_pred)),
        "samples":  int(len(y)),
        "features": ["base_price", "user_offer"],
        "target":   "negotiated_price",
    }

    return svr, knn, metrics


def save_artifacts(svr: SVR, knn: KNeighborsRegressor, metrics: dict) -> None:
    """Persist trained models and metrics to disk using joblib and JSON."""
    joblib.dump(svr, SVR_PATH)
    joblib.dump(knn, KNN_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"\n✓ Models saved to: {MODELS_DIR}")
    print(f"  - svr_model.joblib")
    print(f"  - knn_model.joblib")
    print(f"  - training_metrics.json")


def main() -> None:
    """Load data, build features, train models, and save outputs."""
    print("=" * 40)
    print("NegotiateHub — ML Model Training")
    print("=" * 40)

    df = load_dataset()
    X, y = build_features(df)
    svr, knn, metrics = train_models(X, y)
    save_artifacts(svr, knn, metrics)

    print("\n" + "=" * 40)
    print("Training Complete!")
    print(f"SVR MAE:  ${metrics['svr_mae']:.4f}")
    print(f"k-NN MAE: ${metrics['knn_mae']:.4f}")
    print("=" * 40)


if __name__ == "__main__":
    main()
