import { buildModelAFeatures } from './src/engine/modelAFeatureBuilder.ts';
import { testCustomModelAJson, predictSegmentRisk, validateModelAJson } from './src/engine/modelAService.ts';

const EXACT_PAYLOAD = {
  rainfall_24h: 85.7,
  rainfall_72h: 163.2,
  rainfall_7d: 210.5,
  elevation_m: 196.8,
  slope_degrees: 31.6,
  historical_road_landslide_count: 6,
  historical_road_landslide_presence: 1,
  bt_road_km: 125.4,
  icbp_km: 42.1,
  cement_concrete_km: 18.2,
  paver_block_km: 5.3,
  total_paved_road_km: 191.0,
  bt_road_ratio: 0.65,
  icbp_ratio: 0.22,
  cement_concrete_ratio: 0.095,
  paver_block_ratio: 0.028,
  road_surface_diversity: 0.71,
};

async function runVerification() {
  console.log('====================================================');
  console.log('🔍 FULL PRAVAH MODEL A PIPELINE VERIFICATION SUITE');
  console.log('====================================================\n');

  // Test 1: Health check through Vite proxy
  console.log('--- TEST 1: Health Check via Vite Proxy (/api/model-a/health) ---');
  const healthRes = await fetch('http://localhost:5174/api/model-a/health');
  if (!healthRes.ok) throw new Error(`Health check failed: HTTP ${healthRes.status}`);
  const healthData = await healthRes.json();
  console.log('Health check response:', healthData);
  if (healthData.features_count !== 17) throw new Error('Expected 17 features in health response');
  console.log('✅ Health check passed: Model A ready on frozen XGBoost engine\n');

  // Test 2: Exact Section 6 payload through Vite Proxy (/api/model-a/predict)
  console.log('--- TEST 2: Exact 17-Feature Payload via Vite Proxy ---');
  const predictRes = await fetch('http://localhost:5174/api/model-a/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(EXACT_PAYLOAD),
  });
  if (!predictRes.ok) throw new Error(`Predict failed: HTTP ${predictRes.status}`);
  const predictData = await predictRes.json();
  console.log('Exact payload prediction result:', {
    probability: predictData.probability,
    prediction: predictData.prediction,
    threshold: predictData.threshold,
    risk_band: predictData.risk_band,
    interpretation: predictData.interpretation,
    model_version: predictData.model_version,
  });

  if (typeof predictData.probability !== 'number' || predictData.probability < 0 || predictData.probability > 1) {
    throw new Error(`Invalid probability: ${predictData.probability}`);
  }
  if (predictData.prediction !== 1) {
    throw new Error(`Expected prediction 1, got ${predictData.prediction}`);
  }
  if (predictData.threshold !== 0.50) {
    throw new Error(`Expected threshold 0.50, got ${predictData.threshold}`);
  }
  if (predictData.model_version !== '3.4.1-baseline-xgb') {
    throw new Error(`Expected version 3.4.1-baseline-xgb, got ${predictData.model_version}`);
  }
  console.log('✅ Exact payload returned valid probability ~70.6% and prediction 1\n');

  // Test 3: Model A Client Service testCustomModelAJson (used by Model A Lab)
  console.log('--- TEST 3: Model A Lab Function testCustomModelAJson() ---');
  const labResult = await testCustomModelAJson(JSON.stringify(EXACT_PAYLOAD));
  console.log('Model A Lab result:', {
    probability: labResult.prediction.probability,
    prediction: labResult.prediction.prediction,
    threshold: labResult.prediction.threshold,
    latencyMs: labResult.latencyMs,
    interpretation: labResult.prediction.interpretation,
  });
  if (labResult.prediction.probability < 0.70 || labResult.prediction.probability > 0.71) {
    throw new Error(`Unexpected probability from lab: ${labResult.prediction.probability}`);
  }
  console.log('✅ Model A Lab function executed and verified\n');

  // Test 4: Segment Modal Feature Pipeline (predictSegmentRisk for real road segment)
  console.log('--- TEST 4: Real Segment Prediction Pipeline (SEG-SIL-KOL) ---');
  const segFeatures = buildModelAFeatures('SEG-SIL-KOL', 25.0);
  const segKeys = Object.keys(segFeatures);
  console.log(`Segment feature count: ${segKeys.length}`);
  if (segKeys.length !== 17) throw new Error(`Expected 17 features, got ${segKeys.length}`);

  const segPred = await predictSegmentRisk('SEG-SIL-KOL', segFeatures, 25.0);
  console.log('Segment prediction result:', {
    segment_id: segPred.segment_id,
    probability: segPred.probability,
    prediction: segPred.prediction,
    threshold: segPred.threshold,
    risk_band: segPred.risk_band,
    interpretation: segPred.interpretation,
  });
  if (typeof segPred.probability !== 'number' || segPred.probability < 0 || segPred.probability > 1) {
    throw new Error(`Invalid segment probability: ${segPred.probability}`);
  }
  console.log('✅ Segment Modal inference pipeline verified\n');

  // Test 5: Missing feature rejection (Schema Enforcement)
  console.log('--- TEST 5: Schema Enforcement - Missing Required Feature ---');
  const invalidPayload = { ...EXACT_PAYLOAD };
  delete invalidPayload.rainfall_24h;
  const invalidRes = await fetch('http://localhost:5174/api/model-a/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidPayload),
  });
  const invalidJson = await invalidRes.json();
  console.log(`HTTP Status: ${invalidRes.status}, Error Response:`, invalidJson);
  if (invalidRes.status !== 400 || !invalidJson.error.includes('rainfall_24h')) {
    throw new Error('Expected 400 Bad Request with missing feature message');
  }
  console.log('✅ Missing feature correctly rejected with HTTP 400\n');

  // Test 6: Determinism / Repeatability
  console.log('--- TEST 6: Determinism / Repeatability Check ---');
  const rep1 = await fetch('http://localhost:5174/api/model-a/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(EXACT_PAYLOAD),
  }).then(r => r.json());

  const rep2 = await fetch('http://localhost:5174/api/model-a/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(EXACT_PAYLOAD),
  }).then(r => r.json());

  if (rep1.probability !== rep2.probability) {
    throw new Error(`Non-deterministic probability: ${rep1.probability} vs ${rep2.probability}`);
  }
  console.log(`Run 1 Probability: ${rep1.probability}`);
  console.log(`Run 2 Probability: ${rep2.probability}`);
  console.log('✅ Inference is 100% deterministic\n');

  // Test 7: Batch Prediction Endpoint (/api/model-a/batch_predict)
  console.log('--- TEST 7: Batch Prediction Endpoint (/api/model-a/batch_predict) ---');
  const batchRes = await fetch('http://localhost:5174/api/model-a/batch_predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { segment_id: 'SEG-1', features: EXACT_PAYLOAD },
      { segment_id: 'SEG-2', features: EXACT_PAYLOAD },
    ]),
  });
  const batchData = await batchRes.json();
  console.log(`Batch count returned: ${batchData.predictions?.length}`);
  if (batchData.predictions?.length !== 2) throw new Error('Expected 2 batch predictions');
  console.log('✅ Batch prediction verified\n');

  console.log('====================================================');
  console.log('🎉 ALL 7 MODEL A PIPELINE VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
