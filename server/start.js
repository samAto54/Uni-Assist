/**
 * server/start.js
 * Smart server launcher:
 *  1. Detects the current LAN IP automatically
 *  2. Updates EXPO_PUBLIC_CHAT_API_URL in .env so the app always points to the right address
 *  3. Starts server/index.js and restarts it automatically if it crashes
 */

const { execSync, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── Find the current LAN IP ───────────────────────────────────────────────────
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// ── Update .env with the current IP ──────────────────────────────────────────
function updateEnv(ip) {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;

  let content = fs.readFileSync(envPath, 'utf-8');
  const newUrl = `http://${ip}:4000`;
  const regex = /^EXPO_PUBLIC_CHAT_API_URL=.*/m;

  if (regex.test(content)) {
    const current = content.match(regex)[0].split('=')[1];
    if (current === newUrl) return; // already correct
    content = content.replace(regex, `EXPO_PUBLIC_CHAT_API_URL=${newUrl}`);
  } else {
    content += `\nEXPO_PUBLIC_CHAT_API_URL=${newUrl}\n`;
  }

  fs.writeFileSync(envPath, content, 'utf-8');
  console.log(`[Start] Updated .env: EXPO_PUBLIC_CHAT_API_URL=${newUrl}`);
}

// ── Launch server/index.js with auto-restart ──────────────────────────────────
function startServer(ip) {
  const serverPath = path.resolve(__dirname, 'index.js');
  let restarts = 0;

  function launch() {
    console.log(`\n[Start] Starting Uni-Assist server (restart #${restarts})...`);
    console.log(`[Start] Phone URL: http://${ip}:4000`);
    console.log(`[Start] Health:    http://localhost:4000/health\n`);

    const child = spawn(process.execPath, [serverPath], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('[Start] Server exited cleanly.');
        process.exit(0);
      }
      restarts++;
      if (restarts > 10) {
        console.error('[Start] Too many restarts. Giving up.');
        process.exit(1);
      }
      const delay = Math.min(restarts * 1000, 5000);
      console.warn(`[Start] Server crashed (code ${code}). Restarting in ${delay}ms...`);
      setTimeout(launch, delay);
    });
  }

  launch();
}

// ── Main ──────────────────────────────────────────────────────────────────────
const ip = getLanIp();
updateEnv(ip);
startServer(ip);
