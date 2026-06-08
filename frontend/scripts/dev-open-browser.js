const { spawn } = require('child_process');

const url = 'http://localhost:3000';
const nextBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const next = spawn(nextBin, ['next', 'dev', '--webpack', '-p', '3000'], {
  cwd: process.cwd(),
  env: process.env,
  shell: false,
});

let opened = false;

function openBrowser() {
  if (opened) return;
  opened = true;

  const command = process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]];

  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function watchOutput(stream, output) {
  stream.on('data', (chunk) => {
    const text = chunk.toString();
    output.write(text);
    if (text.includes('Ready') || text.includes('Local:')) {
      openBrowser();
    }
  });
}

watchOutput(next.stdout, process.stdout);
watchOutput(next.stderr, process.stderr);

next.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  next.kill('SIGINT');
});

process.on('SIGTERM', () => {
  next.kill('SIGTERM');
});
