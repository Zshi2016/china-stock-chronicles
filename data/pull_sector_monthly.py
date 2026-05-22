"""
Pull monthly sector performance data for Chinese A-share industry sectors.
Uses THS (同花顺) industry index data via AkShare.
Output: sector_monthly.json
"""
import json
import os
import sys
import time
import pandas as pd

try:
    import akshare as ak
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "akshare", "-q"])
    import akshare as ak

# Disable proxy
os.environ['no_proxy'] = '*'

# Major sectors to pull — names must match THS symbol
SECTORS = [
    "银行", "证券", "保险", "房地产", "白酒", "医药", "半导体",
    "电力", "煤炭", "钢铁", "有色金属", "汽车", "食品饮料",
    "家用电器", "计算机应用", "通信", "传媒", "国防军工",
    "农林牧渔", "建筑装饰", "建筑材料", "基础化学",
    "电子", "机械设备", "石油石化", "交通运输",
    "商贸零售", "社会服务", "纺织服饰", "公用事业",
    "环保", "美容护理", "非银金融",
]

OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sector_monthly.json")
START_DATE = "20100101"
END_DATE = "20260521"

def pull_sector(name):
    """Pull daily OHLCV for a sector, return DataFrame with date index."""
    try:
        df = ak.stock_board_industry_index_ths(
            symbol=name, start_date=START_DATE, end_date=END_DATE
        )
        # Normalize columns
        col_map = {}
        for col in df.columns:
            col_str = str(col).strip()
            if col_str in ("date", "日期", "时间"):
                col_map[col] = "date"
            elif col_str in ("open", "开盘", "开盘价"):
                col_map[col] = "open"
            elif col_str in ("high", "最高", "最高价"):
                col_map[col] = "high"
            elif col_str in ("low", "最低", "最低价"):
                col_map[col] = "low"
            elif col_str in ("close", "收盘", "收盘价"):
                col_map[col] = "close"
            elif "量" in col_str or "volume" in col_str.lower():
                if "额" not in col_str and "amount" not in col_str.lower():
                    col_map[col] = "volume"
        df = df.rename(columns=col_map)

        if "date" not in df.columns:
            df["date"] = df.iloc[:, 0]
        df["date"] = pd.to_datetime(df["date"].astype(str).str[:10])
        if "close" not in df.columns:
            df["close"] = df.iloc[:, 4] if df.shape[1] > 4 else df.iloc[:, 3]
        df["close"] = pd.to_numeric(df["close"], errors="coerce")
        df = df.dropna(subset=["close"])
        df = df.set_index("date").sort_index()
        return df
    except Exception as e:
        print(f"  FAILED: {name} — {e}")
        return None

def monthly_summary(df, name):
    """From daily OHLCV, compute monthly return and volatility."""
    monthly = df["close"].resample("ME").agg(["first", "last"])
    monthly["return_pct"] = ((monthly["last"] - monthly["first"]) / monthly["first"] * 100).round(2)
    monthly = monthly.dropna(subset=["return_pct"])

    records = []
    for dt, row in monthly.iterrows():
        records.append({
            "year": dt.year,
            "month": dt.month,
            "sector": name,
            "return_pct": row["return_pct"],
            "close": round(float(row["last"]), 2),
        })
    return records

def main():
    print(f"Pulling sector data: {len(SECTORS)} sectors, {START_DATE} to {END_DATE}\n")

    all_records = []
    success = 0
    failed = []

    for i, name in enumerate(SECTORS):
        print(f"[{i+1}/{len(SECTORS)}] {name}...", end=" ", flush=True)
        df = pull_sector(name)
        if df is None:
            failed.append(name)
            continue
        records = monthly_summary(df, name)
        all_records.extend(records)
        date_range = f"{df.index[0].strftime('%Y-%m')} ~ {df.index[-1].strftime('%Y-%m')}"
        print(f"OK: {len(df)} daily → {len(records)} monthly  ({date_range})")
        success += 1
        time.sleep(0.3)  # Be polite to the API

    # Sort by year, month, sector
    all_records.sort(key=lambda r: (r["year"], r["month"], r["sector"]))

    # Write output
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False)

    # Summary
    print(f"\n{'='*60}")
    print(f"Done: {success} sectors, {len(all_records)} monthly records")
    if failed:
        print(f"Failed ({len(failed)}): {', '.join(failed)}")
    print(f"Written to: {OUTPUT}")
    print(f"File size: {os.path.getsize(OUTPUT) / 1024:.1f} KB")

    # Quick preview: best month for each sector
    if all_records:
        by_sector = {}
        for r in all_records:
            s = r["sector"]
            if s not in by_sector or r["return_pct"] > by_sector[s]["return_pct"]:
                by_sector[s] = r
        print(f"\nBest month per sector:")
        for s, r in sorted(by_sector.items(), key=lambda x: x[1]["return_pct"], reverse=True):
            print(f"  {s}: {r['year']}-{r['month']:02d}  +{r['return_pct']}%")

if __name__ == "__main__":
    main()
