const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execFileAsync = promisify(execFile);

// Path to Python adapter script
const PYTHON_SCRIPT = path.join(__dirname, '../adapters/openbb_adapter.py');

// Python executable (adjust if using virtual environment)
const PYTHON_CMD = process.env.PYTHON_PATH || 'python3';

// Timeout for Python process (30 seconds)
const TIMEOUT_MS = parseInt(process.env.OPENBB_TIMEOUT_MS) || 30000;

/**
 * Execute Python adapter script
 * @param {string[]} args - Command-line arguments
 * @returns {Promise<any>} Parsed JSON result
 */
async function executePythonScript(args) {
  try {
    const { stdout, stderr } = await execFileAsync(
      PYTHON_CMD,
      [PYTHON_SCRIPT, ...args],
      {
        timeout: TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
        env: process.env  // Pass environment variables to Python (includes OPENBB_* keys)
      }
    );

    // Check for errors in stderr
    if (stderr) {
      console.warn('Python stderr:', stderr);

      // Try to parse error JSON
      try {
        const errorData = JSON.parse(stderr);
        throw new Error(errorData.error || 'Python script error');
      } catch {
        // If not JSON, throw raw stderr
        throw new Error(stderr);
      }
    }

    // Parse stdout as JSON
    return JSON.parse(stdout);

  } catch (error) {
    // Handle timeout
    if (error.killed && error.signal === 'SIGTERM') {
      throw new Error(`OpenBB request timed out after ${TIMEOUT_MS}ms`);
    }

    // Handle Python errors
    if (error.stderr) {
      try {
        const errorData = JSON.parse(error.stderr);
        throw new Error(`OpenBB error: ${errorData.error}`);
      } catch {
        throw new Error(`Python error: ${error.stderr}`);
      }
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Fetch stock fundamentals via OpenBB
 * @param {string} ticker - Stock symbol
 * @param {string} provider - Data provider (default: 'fmp')
 * @returns {Promise<Object>} Fundamental metrics
 */
async function getFundamentals(ticker, provider = 'fmp') {
  console.log(`🔄 Fetching fundamentals for ${ticker} from ${provider}...`);

  const result = await executePythonScript([
    'fundamentals',
    ticker.toUpperCase(),
    provider
  ]);

  console.log(`✅ Got fundamentals for ${ticker} from ${provider}`);
  return result;
}

/**
 * Fetch FRED economic data series
 * @param {string} seriesId - FRED series ID (e.g., 'WALCL')
 * @param {string} startDate - Start date (YYYY-MM-DD), optional
 * @param {string} endDate - End date (YYYY-MM-DD), optional
 * @returns {Promise<Array>} Time series data
 */
async function getFredSeries(seriesId, startDate = null, endDate = null) {
  console.log(`🔄 Fetching FRED series ${seriesId}...`);

  const args = ['fred_series', seriesId];
  if (startDate) args.push(startDate);
  if (endDate) args.push(endDate);

  const result = await executePythonScript(args);

  console.log(`✅ Got ${result.length} data points for ${seriesId}`);
  return result;
}

/**
 * Fetch current stock quote
 * @param {string} ticker - Stock symbol
 * @param {string} provider - Data provider (default: 'fmp')
 * @returns {Promise<Object>} Quote data
 */
async function getQuote(ticker, provider = 'fmp') {
  console.log(`🔄 Fetching quote for ${ticker}...`);

  const result = await executePythonScript([
    'quote',
    ticker.toUpperCase(),
    provider
  ]);

  console.log(`✅ Got quote for ${ticker}: $${result.price}`);
  return result;
}

/**
 * Fetch company profile
 * @param {string} ticker - Stock symbol
 * @param {string} provider - Data provider (default: 'fmp')
 * @returns {Promise<Object>} Company profile
 */
async function getProfile(ticker, provider = 'fmp') {
  console.log(`🔄 Fetching profile for ${ticker}...`);

  const result = await executePythonScript([
    'profile',
    ticker.toUpperCase(),
    provider
  ]);

  console.log(`✅ Got profile for ${ticker}`);
  return result;
}

/**
 * Test OpenBB connection
 * @returns {Promise<boolean>} True if working
 */
async function testConnection() {
  try {
    await getFredSeries('DFF');
    return true;
  } catch (error) {
    console.error('❌ OpenBB connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  getFundamentals,
  getFredSeries,
  getQuote,
  getProfile,
  testConnection
};
