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

# Paths (adjust if needed)
CSV_PATH = Path(r"c:\Users\mdkam\Downloads\negotation.csv")
MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

SVR_PATH = MODELS_DIR / "svr_model.joblib"
KNN_PATH = MODELS_DIR / "knn_model.joblib"
METRICS_PATH = MODELS_DIR / "training_metrics.json"


def load_dataset() -> pd.DataFrame:
    """Load negotiation dataset from CSV and validate required columns."""
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    df = pd.read_csv(CSV_PATH)
    required = {"product_id", "price", "negotiation_history"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in CSV: {', '.join(sorted(missing))}")

    return df


def _extract_last_offer(text: str, fallback: float) -> float:
    """Extract the last numeric offer from negotiation history text."""
    numbers = re.findall(r"\d+(?:\.\d+)?", text or "")
    if not numbers:
        return fallback
    return float(numbers[-1])


def build_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """
    Convert raw dataset into ML features/targets.
    Features: base price + last offered price from negotiation_history.
    Target: midpoint between base price and last offered price (simple counteroffer).
    """
    base_price = df["price"].astype(float).values
    last_offer = df["negotiation_history"].fillna("").astype(str).apply(
        lambda t: _extract_last_offer(t, fallback=0.9)
    ).values

    # If fallback is 0.9, scale to price for missing offers
    last_offer = np.where(last_offer < 2, base_price * last_offer, last_offer)

    X = np.column_stack([base_price, last_offer])
    y = (base_price + last_offer) / 2.0

    return X, y


def train_models(X: np.ndarray, y: np.ndarray) -> tuple[SVR, KNeighborsRegressor, dict]:
    """Train SVR and k-NN regressors and compute MAE metrics."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    svr = SVR(kernel="rbf", C=100, gamma=0.1, epsilon=0.1)
    knn = KNeighborsRegressor(n_neighbors=5, weights="distance")

    svr.fit(X_train, y_train)
    knn.fit(X_train, y_train)

    svr_pred = svr.predict(X_test)
    knn_pred = knn.predict(X_test)

    metrics = {
        "svr_mae": float(mean_absolute_error(y_test, svr_pred)),
        "knn_mae": float(mean_absolute_error(y_test, knn_pred)),
        "samples": int(len(y)),
    }

    return svr, knn, metrics


def save_artifacts(svr: SVR, knn: KNeighborsRegressor, metrics: dict) -> None:
    """Persist trained models and metrics to disk using joblib and JSON."""
    joblib.dump(svr, SVR_PATH)
    joblib.dump(knn, KNN_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")


def main() -> None:
    """Load data, build features, train models, and save outputs."""
    df = load_dataset()
    X, y = build_features(df)
    svr, knn, metrics = train_models(X, y)
    save_artifacts(svr, knn, metrics)
    print("Training complete")
    print(f"SVR MAE: {metrics['svr_mae']:.4f}")
    print(f"k-NN MAE: {metrics['knn_mae']:.4f}")


if __name__ == "__main__":
    main()
