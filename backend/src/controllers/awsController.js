const pool                  = require('../db/pool');
const { encrypt, decrypt }  = require('../services/cryptoService');
const { fetchAWSResources } = require('../services/awsService');
const { calculateCosts }    = require('../services/costService');

// POST /api/aws/credentials  — save (encrypted) AWS keys
exports.saveCredentials = async (req, res) => {
  try {
    const { accessKey, secretKey, region = 'us-east-1' } = req.body;
    const userId = req.userId;

    const access_key_enc = encrypt(accessKey);
    const secret_key_enc = encrypt(secretKey);

    // UPSERT: if user already has an account, update it
    await pool.query(`
      INSERT INTO aws_accounts (user_id, access_key_enc, secret_key_enc, region)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET access_key_enc=$2, secret_key_enc=$3, region=$4
    `, [userId, access_key_enc, secret_key_enc, region]);

    res.json({ message: 'AWS credentials saved' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/aws/resources  — fetch live resources + calculate costs
exports.getResources = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Retrieve encrypted credentials from DB
    const result = await pool.query(
      'SELECT * FROM aws_accounts WHERE user_id = $1', [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No AWS account linked yet' });
    }

    const account   = result.rows[0];
    const accessKey = decrypt(account.access_key_enc);
    const secretKey = decrypt(account.secret_key_enc);

    // 2. Hit AWS API
    const resources = await fetchAWSResources(accessKey, secretKey, account.region);

    // 3. Calculate estimated monthly costs
    const costData = calculateCosts(resources);

    // 4. Save a snapshot for historical charts
    await pool.query(`
      INSERT INTO resource_snapshots (user_id, estimated_cost, snapshot_data)
      VALUES ($1, $2, $3)
    `, [userId, costData.totalMonthly, JSON.stringify(resources)]);

    res.json({ resources, costData });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};