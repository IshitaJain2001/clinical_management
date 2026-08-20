import sys, codecs

# 1. Update frontend/src/utils/api.js
api_file = r'D:\rizwan\frontend\src\utils\api.js'
with open(api_file, 'r', encoding='utf-8') as f:
    api_text = f.read()

find_headers = """    if (config.method === 'get') {
      config.headers['Cache-Control'] = 'no-cache';
      config.headers['Pragma'] = 'no-cache';
      config.headers['Expires'] = '0';
    }"""

replace_headers = """    if (config.method === 'get') {
      config.headers['Cache-Control'] = 'no-cache';
    }"""

if find_headers in api_text:
    api_text = api_text.replace(find_headers, replace_headers)
    with open(api_file, 'w', encoding='utf-8') as f:
        f.write(api_text)
    print("Updated api.js headers")

# 2. Update backend/server.js to ensure CORS is the very first middleware
server_file = r'D:\rizwan\backend\server.js'
with open(server_file, 'r', encoding='utf-8') as f:
    server_text = f.read()

find_app_init = """const app = express();
const PORT = process.env.PORT || 5000;
// Trust proxy so rate limiters see correct client IPs behind reverse proxies
app.set("trust proxy", 1);

// Connect to MongoDB
connectDB();"""

replace_app_init = """const app = express();
const PORT = process.env.PORT || 5000;
// Trust proxy so rate limiters see correct client IPs behind reverse proxies
app.set("trust proxy", 1);

// 1. CORS FIRST — Ensures every request/response (including preflights & errors) has CORS headers
const corsOptions = {
  origin: true,
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

// Connect to MongoDB
connectDB();"""

if find_app_init in server_text:
    server_text = server_text.replace(find_app_init, replace_app_init)
    
    # Remove duplicate CORS block lower down
    dup_cors = """const corsOptions = {
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
app.options('*', cors(corsOptions));"""

    if dup_cors in server_text:
        server_text = server_text.replace(dup_cors, "")

    with open(server_file, 'w', encoding='utf-8') as f:
        f.write(server_text)
    print("Updated server.js CORS position")
