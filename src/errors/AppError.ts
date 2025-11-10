export class AppError extends Error {
  status: number;
  payload?: any;
  constructor(message: string, status = 400, payload?: any) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}
