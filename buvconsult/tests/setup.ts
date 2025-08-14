// Make FormData, File, fetch available (Node 18+ has these via undici)
import { Blob, File } from 'node:buffer';
(global as any).Blob = Blob;
(global as any).File = File;

// Make sure console noise doesn't explode test logs
jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "warn").mockImplementation(() => {});
