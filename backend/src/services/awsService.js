const { EC2Client, DescribeInstancesCommand }     = require('@aws-sdk/client-ec2');
const { S3Client,  ListBucketsCommand }            = require('@aws-sdk/client-s3');
const { RDSClient, DescribeDBInstancesCommand }    = require('@aws-sdk/client-rds');
const { LambdaClient, ListFunctionsCommand }       = require('@aws-sdk/client-lambda');

exports.fetchAWSResources = async (accessKey, secretKey, region) => {
  const credentials = { accessKeyId: accessKey, secretAccessKey: secretKey };
  const config      = { credentials, region };

  // Create one client per service
  const ec2    = new EC2Client(config);
  const s3     = new S3Client(config);
  const rds    = new RDSClient(config);
  const lambda = new LambdaClient(config);

  // Fetch all 4 services IN PARALLEL (Promise.allSettled won't fail if one errors)
  const [ec2Res, s3Res, rdsRes, lambdaRes] = await Promise.allSettled([
    ec2.send(new DescribeInstancesCommand({})),
    s3.send(new ListBucketsCommand({})),
    rds.send(new DescribeDBInstancesCommand({})),
    lambda.send(new ListFunctionsCommand({})),
  ]);

  // --- Parse EC2 ---
  const instances = [];
  if (ec2Res.status === 'fulfilled') {
    for (const reservation of ec2Res.value.Reservations || []) {
      for (const inst of reservation.Instances || []) {
        instances.push({
          id:     inst.InstanceId,
          type:   inst.InstanceType,
          state:  inst.State?.Name,
          region,
        });
      }
    }
  }

  // --- Parse S3 ---
  const buckets = s3Res.status === 'fulfilled'
    ? (s3Res.value.Buckets || []).map(b => ({ name: b.Name }))
    : [];

  // --- Parse RDS ---
  const databases = rdsRes.status === 'fulfilled'
    ? (rdsRes.value.DBInstances || []).map(db => ({
        id:            db.DBInstanceIdentifier,
        engine:        db.Engine,
        instanceClass: db.DBInstanceClass,
        status:        db.DBInstanceStatus,
      }))
    : [];

  // --- Parse Lambda ---
  const functions = lambdaRes.status === 'fulfilled'
    ? (lambdaRes.value.Functions || []).map(f => ({
        name:    f.FunctionName,
        runtime: f.Runtime,
        memory:  f.MemorySize,
      }))
    : [];

  return { instances, buckets, databases, functions };
};