// Approximate on-demand hourly prices (USD, us-east-1, Linux)
const EC2_PRICING = {
  't2.micro':    0.0116,
  't2.small':    0.023,
  't2.medium':   0.0464,
  't3.micro':    0.0104,
  't3.small':    0.0208,
  't3.medium':   0.0416,
  't3.large':    0.0832,
  't3.xlarge':   0.1664,
  't3.2xlarge':  0.3328,
  'm5.large':    0.096,
  'm5.xlarge':   0.192,
  'm5.2xlarge':  0.384,
  'c5.large':    0.085,
  'c5.xlarge':   0.17,
  'r5.large':    0.126,
  'r5.xlarge':   0.252,
};

const RDS_PRICING = {
  'db.t3.micro':  0.017,
  'db.t3.small':  0.034,
  'db.t3.medium': 0.068,
  'db.m5.large':  0.171,
  'db.m5.xlarge': 0.342,
  'db.r5.large':  0.24,
};

const S3_ESTIMATE_PER_BUCKET  = 5;   // ~$5/month rough estimate
const LAMBDA_ESTIMATE_PER_FN  = 2.5; // ~$2.50/month rough estimate

exports.calculateCosts = (resources) => {
  const HOURS_PER_MONTH = 24 * 30; // 720

  // EC2: only count RUNNING instances
  const ec2Details = resources.instances
    .filter(i => i.state === 'running')
    .map(i => {
      const hourly  = EC2_PRICING[i.type] || 0.05; // fallback for unknown types
      const monthly = parseFloat((hourly * HOURS_PER_MONTH).toFixed(2));
      return { id: i.id, type: i.type, monthly };
    });

  // RDS
  const rdsDetails = resources.databases.map(db => {
    const hourly  = RDS_PRICING[db.instanceClass] || 0.1;
    const monthly = parseFloat((hourly * HOURS_PER_MONTH).toFixed(2));
    return { id: db.id, class: db.instanceClass, monthly };
  });

  // Totals per service
  const ec2Total    = ec2Details.reduce((sum, e) => sum + e.monthly, 0);
  const rdsTotal    = rdsDetails.reduce((sum, r) => sum + r.monthly, 0);
  const s3Total     = resources.buckets.length   * S3_ESTIMATE_PER_BUCKET;
  const lambdaTotal = resources.functions.length * LAMBDA_ESTIMATE_PER_FN;

  const totalMonthly = parseFloat(
    (ec2Total + rdsTotal + s3Total + lambdaTotal).toFixed(2)
  );

  return {
    totalMonthly,
    breakdown: {
      ec2:    parseFloat(ec2Total.toFixed(2)),
      rds:    parseFloat(rdsTotal.toFixed(2)),
      s3:     parseFloat(s3Total.toFixed(2)),
      lambda: parseFloat(lambdaTotal.toFixed(2)),
    },
    details: { ec2Details, rdsDetails },
  };
};