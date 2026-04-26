/**
 * 환경 변수 검증 및 관리
 * 서버 시작 시 필수 환경 변수 존재 여부를 확인합니다.
 */

interface EnvConfig {
  database: {
    url: string;
  };
  pinecone: {
    apiKey: string;
    indexName: string;
  };
  gemini: {
    apiKey: string;
  };
  groq: {
    apiKey: string;
  };
  jwt: {
    secret: string;
  };
  toss: {
    clientKey: string;
    secretKey: string;
  };
}

/**
 * 필수 환경 변수를 검증하고 타입 안전한 객체로 반환합니다.
 */
function validateEnv(): EnvConfig {
  const required: Record<string, string | undefined> = {
    DATABASE_URL: process.env.DATABASE_URL,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    TOSS_CLIENT_KEY: process.env.TOSS_CLIENT_KEY,
    TOSS_SECRET_KEY: process.env.TOSS_SECRET_KEY,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `필수 환경 변수가 누락되었습니다:\n${missing.map((k) => `  - ${k}`).join("\n")}`
    );
  }

  return {
    database: {
      url: required.DATABASE_URL!,
    },
    pinecone: {
      apiKey: required.PINECONE_API_KEY!,
      indexName: required.PINECONE_INDEX_NAME!,
    },
    gemini: {
      apiKey: required.GEMINI_API_KEY!,
    },
    groq: {
      apiKey: required.GROQ_API_KEY!,
    },
    jwt: {
      secret: required.JWT_SECRET!,
    },
    toss: {
      clientKey: required.TOSS_CLIENT_KEY!,
      secretKey: required.TOSS_SECRET_KEY!,
    },
  };
}

let envConfig: EnvConfig | null = null;

/**
 * 환경 변수 설정을 가져옵니다.
 * 첫 호출 시 검증이 수행됩니다.
 */
export function getEnv(): EnvConfig {
  if (!envConfig) {
    envConfig = validateEnv();
  }
  return envConfig;
}
