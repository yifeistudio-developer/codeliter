import { randomBytes, scrypt } from "node:crypto";
import { stdin, stdout } from "node:process";

if (!stdin.isTTY || !stdin.setRawMode) {
  throw new Error("Run this command in an interactive terminal");
}

stdout.write("Admin password (minimum 12 characters): ");
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

let password = "";
stdin.on("data", (chunk: string) => {
  for (const character of chunk) {
    if (character === "\u0003") {
      stdout.write("\nCancelled\n");
      process.exit(1);
    }

    if (character === "\r" || character === "\n") {
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      void printHash(password);
      return;
    }

    if (character === "\u007f" || character === "\b") {
      password = password.slice(0, -1);
    } else {
      password += character;
    }
  }
});

async function printHash(value: string): Promise<void> {
  if (value.length < 12) {
    throw new Error("Admin password must contain at least 12 characters");
  }

  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(value, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

  stdout.write(`${salt}:${derivedKey.toString("base64url")}\n`);
}
