import { openSync, readSync, closeSync } from 'fs'

// Read file and return a Buffer
export const readFile = (fileName: string, fileSize: number): Buffer => {
  const fd = openSync(fileName, 'r')
  const buff = Buffer.alloc(fileSize)
  readSync(fd, buff, 0, fileSize, 0)
  closeSync(fd)
  return buff
}
