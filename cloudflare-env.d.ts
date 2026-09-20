declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    AUTH_EMAIL?: SendEmail;
    RITEVENUE_ADMIN_EMAIL?: string;
    RITEVENUE_AUTH_SECRET?: string;
    RITEVENUE_AUTH_DEV_OTP?: string;
    RITEVENUE_OTP_FROM_EMAIL?: string;
    RITEVENUE_DEPLOYMENT?: string;
  }
}
