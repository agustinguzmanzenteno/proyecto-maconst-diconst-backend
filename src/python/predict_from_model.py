import json, argparse, sys
import pandas as pd
from prophet.serialize import model_from_json

def args_():
    p = argparse.ArgumentParser()
    p.add_argument("--model_path", required=True)
    p.add_argument("--freq", default="MS")
    p.add_argument("--periods", type=int)
    p.add_argument("--until")
    p.add_argument("--from", dest="from_")
    p.add_argument("--regressors", default="")
    return p.parse_args()

def err(msg, last_ds=None):
    print(json.dumps({"error": True, "message": msg, "last_ds": last_ds}, ensure_ascii=False))
    sys.exit(2)

def month_start(ts):
    ts = pd.to_datetime(ts)
    return pd.Timestamp(year=ts.year, month=ts.month, day=1)

def months_between(a, b):
    """Número de meses completos de a -> b (si b <= a, devuelve 0 o negativo)."""
    return (b.year - a.year) * 12 + (b.month - a.month)

try:
    a = args_()

    with open(a.model_path, "r", encoding="utf-8") as f:
        m = model_from_json(json.load(f))

    hist = m.history.copy()
    last_ds = pd.to_datetime(hist["ds"].max())

    if a.freq.upper() == "MS":
        last_ds = month_start(last_ds)

    if a.until:
        until = pd.to_datetime(a.until)
        if a.freq.upper() == "MS":
            until = month_start(until)

        if until <= last_ds and not a.periods:
            err(
                f"La fecha 'hasta' ({until.date()}) debe ser posterior a la última fecha del modelo ({last_ds.date()}).",
                last_ds=last_ds.strftime("%Y-%m-%d")
            )

        if a.freq.upper() == "MS":
            diff = months_between(last_ds, until)
            periods = max(diff, 0)
        else:
            rng = pd.date_range(start=last_ds, end=until, freq=a.freq)
            periods = max(len(rng) - 1, 0)
    else:
        periods = int(a.periods or 12)

    future = m.make_future_dataframe(periods=periods, freq=a.freq)

    regs = [r.strip() for r in a.regressors.split(",") if r.strip()]
    for col in regs:
        if col not in future.columns:
            future[col] = 0
        future.loc[future["ds"] > last_ds, col] = 0

    forecast = m.predict(future)[["ds", "yhat", "yhat_lower", "yhat_upper"]]

    if a.from_:
        d0 = pd.to_datetime(a.from_)
        if a.freq.upper() == "MS":
            d0 = month_start(d0)
        forecast = forecast[forecast["ds"] >= d0]

    if a.until:
        d1 = pd.to_datetime(a.until)
        if a.freq.upper() == "MS":
            d1 = month_start(d1)
        forecast = forecast[forecast["ds"] <= d1]

    data = [
        {
            "ds": pd.to_datetime(r.ds).strftime("%Y-%m-%d"),
            "yhat": float(r.yhat),
            "yhat_lower": float(r.yhat_lower),
            "yhat_upper": float(r.yhat_upper),
        }
        for _, r in forecast.iterrows()
    ]

    print(json.dumps({
        "error": False,
        "last_ds": last_ds.strftime("%Y-%m-%d"),
        "periods_used": periods,
        "freq": a.freq,
        "data": data
    }, ensure_ascii=False))

except Exception as e:
    err(f"Fallo en predict_from_model.py: {e}")