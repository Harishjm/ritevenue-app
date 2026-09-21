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
    RITEVENUE_GOOGLE_CLIENT_ID?: string;
    RITEVENUE_GOOGLE_CLIENT_SECRET?: string;
    RITEVENUE_GOOGLE_REDIRECT_URI?: string;
  }
}
