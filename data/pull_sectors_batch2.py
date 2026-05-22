"""Pull additional sectors not in first batch."""
import json, os, sys, time, pandas as pd
os.environ['no_proxy'] = '*'
import akshare as ak

# Additional sectors verified working with THS
SECTORS = [
    "医药商业", "中药", "汽车整车", "通信设备", "文化传媒",
    "物流", "零售", "白色家电", "小家电", "化学制品",
    "专用设备", "港口", "燃气", "多元金融", "游戏",
]

START_DATE = "20100101"
END_DATE = "20260521"
OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sector_monthly_batch2.json")

def pull_sector(name):
    try:
        df = ak.stock_board_industry_index_ths(symbol=name, start_date=START_DATE, end_date=END_DATE)
        col_map = {}
        for col in df.columns:
            col_str = str(col).strip()
            if col_str in ("date", "日期", "时间"): col_map[col] = "date"
            elif col_str in ("open", "开盘", "开盘价"): col_map[col] = "open"
            elif col_str in ("high", "最高", "最高价"): col_map[col] = "high"
            elif col_str in ("low", "最低", "最低价"): col_map[col] = "low"
            elif col_str in ("close", "收盘", "收盘价"): col_map[col] = "close"
        df = df.rename(columns=col_map)
        if "date" not in df.columns: df["date"] = df.iloc[:, 0]
        df["date"] = pd.to_datetime(df["date"].astype(str).str[:10])
        if "close" not in df.columns: df["close"] = df.iloc[:, 4] if df.shape[1] > 4 else df.iloc[:, 3]
        df["close"] = pd.to_numeric(df["close"], errors="coerce")
        df = df.dropna(subset=["close"]).set_index("date").sort_index()
        return df
    except Exception as e:
        print(f"  FAILED: {e}")
        return None

def monthly_summary(df, name):
    monthly = df["close"].resample("ME").agg(["first", "last"])
    monthly["return_pct"] = ((monthly["last"] - monthly["first"]) / monthly["first"] * 100).round(2)
    monthly = monthly.dropna(subset=["return_pct"])
    records = []
    for dt, row in monthly.iterrows():
        records.append({"year": dt.year, "month": dt.month, "sector": name,
                        "return_pct": row["return_pct"], "close": round(float(row["last"]), 2)})
    return records

def main():
    all_records = []
    for name in SECTORS:
        print(f"{name}...", end=" ", flush=True)
        df = pull_sector(name)
        if df is None: continue
        records = monthly_summary(df, name)
        all_records.extend(records)
        print(f"OK: {len(records)} monthly ({df.index[0].strftime('%Y-%m')} ~ {df.index[-1].strftime('%Y-%m')})")
        time.sleep(0.3)

    all_records.sort(key=lambda r: (r["year"], r["month"], r["sector"]))
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False)
    print(f"\nWrote {len(all_records)} records from {len(set(r['sector'] for r in all_records))} sectors to {OUTPUT}")

if __name__ == "__main__":
    main()
