"""
Negotiation model helpers.
This uses SVR and k-NN regressors to estimate a counteroffer price.
If scikit-learn is not available, we fall back to a simple heuristic.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Tuple

try:
    import numpy as np
    from sklearn.neighbors import KNeighborsRegressor
    from sklearn.svm import SVR

    SKLEARN_AVAILABLE = True
except Exception:  # pragma: no cover - fallback if sklearn is missing
    SKLEARN_AVAILABLE = False

try:
    import joblib

    JOBLIB_AVAILABLE = True
except Exception:  # pragma: no cover - fallback if joblib is missing
    JOBLIB_AVAILABLE = False


def _train_models(base_price: float) -> Tuple["SVR", "KNeighborsRegressor"]:
    """
    Train SVR and k-NN models on synthetic ratio data.
    This keeps the example self-contained while still using the requested models.
    """
    # Feature = offer_ratio, Target = suggested_ratio
    ratios = np.linspace(0.5, 1.1, 25)
    # Suggested ratios: closer to base price but responsive to offer
    suggested = 0.7 + 0.3 * ratios  # ranges roughly 0.85 .. 1.03

    X = ratios.reshape(-1, 1)
    y = suggested * base_price

    svr = SVR(kernel="rbf", C=100, gamma=0.5, epsilon=0.1)
    knn = KNeighborsRegressor(n_neighbors=3, weights="distance")

    svr.fit(X, y)
    knn.fit(X, y)

    return svr, knn


def load_models(models_dir: Path) -> Tuple[object, object]:
    """
    Load SVR and k-NN models from disk.
    Expects: models_dir/svr_model.joblib and models_dir/knn_model.joblib
    """
    if not JOBLIB_AVAILABLE:
        raise RuntimeError("joblib is required to load trained models")

    svr_path = models_dir / "svr_model.joblib"
    knn_path = models_dir / "knn_model.joblib"
    return joblib.load(svr_path), joblib.load(knn_path)


def compute_counteroffer(user_price: float, base_price: float, svr_model, knn_model) -> float:
    """
    Compute a counteroffer price using SVR + k-NN models.
    Steps:
    1) Predict a global price trend from SVR.
    2) Use k-NN to capture local similarity from past negotiations.
    3) Blend predictions and apply business rules.
    """
    if base_price <= 0:
        return max(0.0, float(user_price))

    # Build the feature vector expected by the models.
    # Here we assume training used [base_price, user_price] as features.
    if SKLEARN_AVAILABLE:
        X = np.array([[float(base_price), float(user_price)]])
        svr_pred = float(svr_model.predict(X)[0])  # global trend prediction
        knn_pred = float(knn_model.predict(X)[0])  # local similarity prediction
    else:
        # Fallback heuristic if sklearn isn't available
        svr_pred = base_price * 0.95
        knn_pred = base_price * 0.9

    # Blend model outputs with slightly higher weight on SVR (global trend)
    suggested = (0.6 * svr_pred) + (0.4 * knn_pred)

    # Business rules:
    # - Never suggest below user's offer
    # - Keep within a reasonable range of base price
    min_counter = max(float(user_price), base_price * 0.85)
    max_counter = base_price * 1.05
    suggested = max(min_counter, min(suggested, max_counter))

    return round(suggested, 2)
