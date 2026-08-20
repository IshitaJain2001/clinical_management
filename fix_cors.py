import sys, codecs

server_file = r'D:\rizwan\backend\server.js'
with open(server_file, 'r', encoding='utf-8') as f:
    text = f.read()

find_cors_block = """// Middleware — compression first so all downstream JSON responses are gzipped
app.use(compression());
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000", "http://localhost:5173"];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.indexOf(origin) !== -1 || 
      origin.startsWith("http://localhost:") || 
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".onrender.com")
    ) {
      return callback(null, true);
    }
    console.warn(`[CORS] Request from origin ${origin} allowed via fallback.`);
    callback(null, true);
  },
  credentials: true
};

app.use(cors(corsOptions));

// Security middlewares
app.use(helmet());"""

replace_cors_block = """// Middleware — compression first so all downstream JSON responses are gzipped
app.use(compression());

const corsOptions = {
  origin: true, // Allow any requesting origin dynamically (reflects Origin header with credentials support)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-tenant-id',
    'x-bypass-consent-emergency',
    'Cache-Control',
    'Pragma',
    'Expires',
    'x-requested-with',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security middlewares (allow cross-origin requests from Render frontend)
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false
}));"""

if find_cors_block in text:
    text = text.replace(find_cors_block, replace_cors_block)
    with open(server_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated CORS configuration in server.js successfully!")
else:
    print("Could not find find_cors_block in server.js")
