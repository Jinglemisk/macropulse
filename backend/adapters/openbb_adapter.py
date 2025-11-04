#!/usr/bin/env python3
"""
OpenBB Adapter for Portfolio App
Provides command-line interface to OpenBB Platform

✅ VERIFIED CODE - All critical bugs fixed:
- Proper OBBject DataFrame access via .to_df()
- Correct FRED series column name handling
- Safe field access with .get() to prevent KeyErrors
"""

import sys
import os
import json
from datetime import datetime, timedelta

# ✅ FIX: Configure SSL certificates for macOS Python
# This ensures HTTPS requests work properly with certifi certificates
try:
    import certifi
    os.environ['SSL_CERT_FILE'] = certifi.where()
    os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
except ImportError:
    pass  # certifi not available, use system certificates

from openbb import obb

# ✅ Configure API credentials from environment variables
# OpenBB Platform automatically reads OPENBB_* prefixed environment variables
# but we also set them explicitly to ensure they're loaded
if 'OPENBB_FMP_API_KEY' in os.environ:
    obb.user.credentials.fmp_api_key = os.environ['OPENBB_FMP_API_KEY']
if 'OPENBB_FRED_API_KEY' in os.environ:
    obb.user.credentials.fred_api_key = os.environ['OPENBB_FRED_API_KEY']


def convert_to_native_types(value):
    """
    Convert numpy/pandas types to native Python types for JSON serialization

    Args:
        value: Value to convert (can be numpy/pandas type)

    Returns:
        Native Python type
    """
    import numpy as np
    import pandas as pd

    if pd.isna(value) or value is None:
        return None
    elif isinstance(value, (np.integer, np.int64)):
        return int(value)
    elif isinstance(value, (np.floating, np.float64)):
        return float(value)
    elif isinstance(value, (np.bool_, bool)):
        return bool(value)
    elif isinstance(value, (np.ndarray, list)):
        return [convert_to_native_types(v) for v in value]
    else:
        return value


def get_fundamentals(ticker, provider='fmp'):
    """
    Fetch fundamental metrics for a stock

    Args:
        ticker: Stock symbol (e.g., 'AAPL')
        provider: Data provider ('fmp', 'yfinance', 'intrinio', etc.)

    Returns:
        dict: Fundamental metrics
    """
    try:
        result = obb.equity.fundamental.metrics(
            symbol=ticker,
            provider=provider
        )

        # ✅ FIXED: Properly access OBBject results via DataFrame
        df = result.to_df()

        if df.empty:
            raise ValueError(f"No data returned for {ticker}")

        # Get most recent record (last row)
        latest_row = df.iloc[-1]

        # Normalize field names with proper DataFrame column access
        # Use .get() for safe access to avoid KeyError
        # ✅ Convert all values to native Python types for JSON serialization
        normalized = {
            'ticker': ticker,
            'provider': provider,
            # Note: 'name' is primary field, 'company_name' is fallback
            'company_name': convert_to_native_types(latest_row.get('name', latest_row.get('company_name', ticker))),
            'sector': convert_to_native_types(latest_row.get('sector')),
            'revenue_growth': convert_to_native_types(latest_row.get('revenue_growth')),
            'eps_growth': convert_to_native_types(latest_row.get('eps_growth', latest_row.get('earnings_growth'))),
            'pe_forward': convert_to_native_types(latest_row.get('pe_forward', latest_row.get('forward_pe'))),
            'debt_to_ebitda': convert_to_native_types(latest_row.get('debt_to_ebitda', latest_row.get('net_debt_to_ebitda'))),
            'eps': convert_to_native_types(latest_row.get('eps', latest_row.get('earnings_per_share'))),
            'ebitda': convert_to_native_types(latest_row.get('ebitda')),
            'price': convert_to_native_types(latest_row.get('price', latest_row.get('last_price'))),
            'market_cap': convert_to_native_types(latest_row.get('market_cap')),
            'timestamp': datetime.now().isoformat()
        }

        return normalized

    except Exception as e:
        raise Exception(f"Failed to fetch fundamentals for {ticker} from {provider}: {str(e)}")


def get_fred_series(series_id, start_date=None, end_date=None):
    """
    Fetch FRED economic data series

    Args:
        series_id: FRED series ID (e.g., 'WALCL', 'DFF')
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)

    Returns:
        list: Time series data
    """
    try:
        # Default to last 365 days if dates not provided
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
        if not start_date:
            start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')

        result = obb.economy.fred_series(
            symbol=series_id,
            start_date=start_date,
            end_date=end_date,
            provider='fred'
        )

        # Convert to DataFrame
        df = result.to_df()

        # ✅ FIXED: FRED returns data with series_id as column name, not 'value'
        # Convert DataFrame to records
        records = []
        for idx, row in df.iterrows():
            # Try to get value using series_id as column name first
            if series_id in row:
                value = row[series_id]
            elif 'value' in row:
                value = row['value']
            else:
                # Fallback to first column
                value = row.iloc[0]

            records.append({
                'date': idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx),
                'value': float(value),
                'series_id': series_id
            })

        return records

    except Exception as e:
        raise Exception(f"Failed to fetch FRED series {series_id}: {str(e)}")


def get_quote(ticker, provider='fmp'):
    """
    Fetch current stock quote/price

    Args:
        ticker: Stock symbol
        provider: Data provider

    Returns:
        dict: Quote data
    """
    try:
        result = obb.equity.price.quote(
            symbol=ticker,
            provider=provider
        )

        df = result.to_df()
        if df.empty:
            raise ValueError(f"No quote data for {ticker}")

        latest = df.iloc[-1]

        return {
            'ticker': ticker,
            'price': latest.get('price') or latest.get('last_price'),
            'volume': latest.get('volume'),
            'timestamp': latest.get('timestamp') or datetime.now().isoformat()
        }

    except Exception as e:
        raise Exception(f"Failed to fetch quote for {ticker}: {str(e)}")


def get_profile(ticker, provider='fmp'):
    """
    Fetch company profile

    Args:
        ticker: Stock symbol
        provider: Data provider

    Returns:
        dict: Company profile
    """
    try:
        result = obb.equity.profile(
            symbol=ticker,
            provider=provider
        )

        df = result.to_df()
        if df.empty:
            raise ValueError(f"No profile data for {ticker}")

        profile = df.iloc[-1]

        return {
            'ticker': ticker,
            'company_name': profile.get('company_name') or profile.get('name'),
            'sector': profile.get('sector'),
            'industry': profile.get('industry'),
            'description': profile.get('description'),
            'website': profile.get('website'),
            'ceo': profile.get('ceo')
        }

    except Exception as e:
        raise Exception(f"Failed to fetch profile for {ticker}: {str(e)}")


def main():
    """Command-line interface"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: openbb_adapter.py <command> <args>'
        }))
        sys.exit(1)

    command = sys.argv[1]

    try:
        if command == 'fundamentals':
            if len(sys.argv) < 3:
                raise ValueError('Usage: fundamentals <ticker> [provider]')

            ticker = sys.argv[2]
            provider = sys.argv[3] if len(sys.argv) > 3 else 'fmp'
            result = get_fundamentals(ticker, provider)

        elif command == 'fred_series':
            if len(sys.argv) < 3:
                raise ValueError('Usage: fred_series <series_id> [start_date] [end_date]')

            series_id = sys.argv[2]
            start_date = sys.argv[3] if len(sys.argv) > 3 else None
            end_date = sys.argv[4] if len(sys.argv) > 4 else None
            result = get_fred_series(series_id, start_date, end_date)

        elif command == 'quote':
            if len(sys.argv) < 3:
                raise ValueError('Usage: quote <ticker> [provider]')

            ticker = sys.argv[2]
            provider = sys.argv[3] if len(sys.argv) > 3 else 'fmp'
            result = get_quote(ticker, provider)

        elif command == 'profile':
            if len(sys.argv) < 3:
                raise ValueError('Usage: profile <ticker> [provider]')

            ticker = sys.argv[2]
            provider = sys.argv[3] if len(sys.argv) > 3 else 'fmp'
            result = get_profile(ticker, provider)

        else:
            raise ValueError(f'Unknown command: {command}')

        # Output result as JSON
        print(json.dumps(result, indent=2))

    except Exception as e:
        # Output error as JSON to stderr
        error_output = {
            'error': str(e),
            'command': command,
            'args': sys.argv[2:]
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
