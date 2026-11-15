import { randomBytes, scrypt as nodeScrypt } from "node:crypto";
import { promisify } from "node:util";
import { stdin, stdout } from "node:process";

const scrypt = promisify(nodeScrypt);

if (!stdin.isTTY || !stdin.setRawMode) {
  console.error("请在交互式终端中运行该命令。");
  process.exit(1);
}

const password = await new Promise((resolve) => {
  let value = "";
  stdout.write("请输入后台密码（至少 12 个字符）：");
  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.resume();
  const onData = (key) => {
    if (key === "\r" || key === "\n") {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      stdout.write("\n");
      resolve(value);
      return;
    }
    if (key === "\u0003") process.exit(130);
    if (key === "\u007f") {
      if (value) {
        value = value.slice(0, -1);
        stdout.write("\b \b");
      }
      return;
    }
    if (!key.startsWith("\u001b")) {
      value += key;
      stdout.write("*");
    }
  };
  stdin.on("data", onData);
});

if (password.length < 12) {
  console.error("密码至少需要 12 个字符。");
  process.exit(1);
}

const N = 16384;
const r = 8;
const p = 1;
const salt = randomBytes(24);
const hash = await scrypt(password, salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
console.log(`ADMIN_PASSWORD_HASH=scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${Buffer.from(hash).toString("base64url")}`);
console.log(`SESSION_SECRET=${randomBytes(48).toString("base64url")}`);
