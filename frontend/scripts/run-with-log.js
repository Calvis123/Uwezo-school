const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const [, , logFile, command, ...args] = process.argv;

if (!logFile || !command) {
  console.error("Usage: node scripts/run-with-log.js <log-file> <command> [...args]");
  process.exit(1);
}

const logPath = path.resolve(process.cwd(), logFile);
const logStream = fs.createWriteStream(logPath, { flags: "a" });
let resolvedCommand = command;
let resolvedArgs = args;

if (command === "next") {
  resolvedCommand = process.execPath;
  resolvedArgs = [require.resolve("next/dist/bin/next"), ...args];
} else if (process.platform === "win32" && !path.extname(command)) {
  resolvedCommand = `${command}.cmd`;
}

const child = spawn(resolvedCommand, resolvedArgs, {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
});

const forward = (stream, target) => {
  stream.on("data", (chunk) => {
    target.write(chunk);
    logStream.write(chunk);
  });
};

forward(child.stdout, process.stdout);
forward(child.stderr, process.stderr);

child.on("error", (error) => {
  console.error(error.message);
  logStream.end(() => process.exit(1));
});

child.on("close", (code) => {
  logStream.end(() => process.exit(code ?? 1));
});
