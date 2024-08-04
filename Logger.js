import { createLogger, format, transports } from 'winston'
const { combine, timestamp, label, printf } = format

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const Logger = createLogger({
  format: combine(
    label({ label: 'guillotine-api' }),
    timestamp(),
    myFormat
  ),
  transports: [new transports.Console()]
});

export default Logger
