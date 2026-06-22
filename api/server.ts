/**
 * local server entry file, for local development
 */
import app from './app.js';
import { processAllSla } from './services/slaService.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  
  processAllSla();
  console.log('SLA 初始化检查完成');
  
  setInterval(() => {
    const result = processAllSla();
    if (result.warnings > 0 || result.overdues > 0 || result.escalations > 0) {
      console.log(`[SLA 检查] 预警:${result.warnings} 超时:${result.overdues} 升级:${result.escalations}`);
    }
  }, 60000);
  console.log('SLA 定时检查已启动（每分钟执行一次）');
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;