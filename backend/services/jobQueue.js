const { v4: uuidv4 } = require('uuid');
const { runAnalysis } = require('./claudeRunner');
const { createPdf } = require('./reportGenerator');
const { sendReport } = require('./mailer');
const { archive } = require('./archiver');

const jobs = new Map();
const queue = [];
let running = false;

const TIMEOUT_MS = 35 * 60 * 1000; // 35 minutes hard cap per job
const CLEANUP_AGE_MS = 2 * 60 * 60 * 1000; // remove done/failed jobs after 2 hours

function createJob(stock, email) {
  const id = uuidv4();
  const job = {
    id,
    stock,
    email,
    status: 'queued',
    stage: '',
    progress: 0,
    error: null,
    resultPath: null,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
  };
  jobs.set(id, job);
  queue.push(id);
  processQueue();
  return { jobId: id, position: queue.length };
}

function getJob(id) {
  const job = jobs.get(id);
  if (!job) return null;
  const pos = queue.indexOf(id);
  return {
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    error: job.error,
    position: pos >= 0 ? pos + 1 : null,
    createdAt: job.createdAt,
    // estimated wait: ~12 minutes per queued job ahead, rounded
    estWaitMin: pos > 0 ? pos * 12 : (job.status === 'queued' ? 6 : null),
  };
}

// Queue-wide health check — exposed via getQueueStats
function getQueueStats() {
  const queued = queue.length;
  const runningCount = [...jobs.values()].filter(j => j.status === 'running').length;
  const doneToday = [...jobs.values()].filter(
    j => j.status === 'done' && Date.now() - j.createdAt < 24 * 60 * 60 * 1000
  ).length;
  return { queued, running: runningCount, doneToday };
}

async function processQueue() {
  // Cleanup expired jobs first
  for (const [id, job] of jobs) {
    if (
      (job.status === 'done' || job.status === 'failed') &&
      Date.now() - (job.completedAt || job.createdAt) > CLEANUP_AGE_MS
    ) {
      jobs.delete(id);
    }
  }

  // Force-reset stuck running jobs (use startedAt, fallback to createdAt)
  for (const [id, job] of jobs) {
    const runStart = job.startedAt || job.createdAt;
    if (job.status === 'running' && Date.now() - runStart > TIMEOUT_MS) {
      job.status = 'failed';
      job.error = '分析超时（超过 35 分钟），系统自动终止';
      job.stage = '超时';
      job.completedAt = Date.now();
    }
  }

  if (running || queue.length === 0) return;

  running = true;
  const jobId = queue.shift();
  const job = jobs.get(jobId);

  if (!job) {
    running = false;
    processQueue();
    return;
  }

  job.status = 'running';
  job.stage = '启动分析引擎...';
  job.progress = 5;
  job.startedAt = Date.now();

  try {
    const { markdown } = await runAnalysis(job.stock, (stage, progress) => {
      job.stage = stage;
      job.progress = progress;
    });

    // Archive full markdown + extracted key metrics
    archive(jobId, job.stock, markdown);

    job.stage = '生成 PDF 报告...';
    job.progress = 90;
    const outputPath = await createPdf(markdown, jobId);
    job.resultPath = outputPath;

    job.stage = '发送邮件...';
    job.progress = 95;
    await sendReport(job.email, job.stock, outputPath);

    job.status = 'done';
    job.progress = 100;
    job.stage = '完成';
    job.completedAt = Date.now();
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    job.stage = '失败';
    job.completedAt = Date.now();
  } finally {
    running = false;
    // Schedule next queued job after a short cooldown
    setTimeout(() => processQueue(), 3000);
  }
}

module.exports = { createJob, getJob, getQueueStats };
